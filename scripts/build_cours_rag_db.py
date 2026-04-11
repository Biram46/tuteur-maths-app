import os
import json
import time
import requests
import fitz  # PyMuPDF
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv('.env.local')

GEMINI_API_KEY = os.getenv('NEXT_PUBLIC_GEMINI_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not all([OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    print("❌ Clés d'API manquantes dans .env.local")
    exit(1)

# Dossiers à scanner
DIRECTORIES = [
    {"path": r"D:\AI\lycee\1spé\cours", "niveau": "1spe"},
    {"path": r"D:\AI\lycee\seconde\cours", "niveau": "seconde"},
    {"path": r"D:\annee 25 26", "niveau": "auto"} # auto = déduit du nom de fichier/dossier
]

def auto_infer_niveau(filepath):
    fp = filepath.lower()
    if 'seconde' in fp or '2de' in fp: return 'seconde'
    if '1spe' in fp or 'premiere' in fp or '1ere' in fp: return '1spe'
    if 'terminale' in fp or 'tle' in fp: return 'terminale'
    if 'stmg' in fp: return 'stmg'
    return 'lycee'


def chunk_text(text, max_chars=1200):
    """Découpe un grand texte en petits blocs pour le RAG."""
    chunks = []
    paragraphs = [p.strip() for p in text.split('\n\n') if len(p.strip()) > 30]
    
    current_chunk = ""
    for p in paragraphs:
        if len(current_chunk) + len(p) > max_chars and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = ""
        current_chunk += p + "\n\n"
    
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    return chunks

def extract_text(filepath):
    """Extrait le texte d'un PDF ou d'un fichier texte (.tex)."""
    ext = os.path.splitext(filepath)[1].lower()
    text = ""
    
    try:
        if ext == '.pdf':
            doc = fitz.open(filepath)
            for page in doc:
                text += page.get_text() + "\n"
        elif ext in ['.tex', '.txt', '.md']:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                text = f.read()
    except Exception as e:
        print(f"Erreur d'extraction pour {os.path.basename(filepath)} : {e}")
        
    return text

def get_embedding(text):
    """Obtient le vecteur 1536D depuis l'API OpenAI."""
    url = "https://api.openai.com/v1/embeddings"
    payload = {
        "model": "text-embedding-ada-002",
        "input": text
    }
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, json=payload, headers=headers)
            if resp.status_code == 429:
                print("⏳ Rate Limit OpenAI, pause de 10s...")
                time.sleep(10)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data["data"][0]["embedding"]
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            time.sleep(3)

def delete_existing_file(filename):
    """Supprime les anciens vecteurs de ce fichier pour éviter les doublons lors des mises à jour."""
    # Supabase REST ne permet pas toujours de delete facilement sur des clés JSONB via URL de façon intuitive sans pgrest setup poussé.
    # Pour faire simple en REST:
    url = f"{SUPABASE_URL}/rest/v1/rag_documents?metadata->>filename=eq.{filename}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
    }
    requests.delete(url, headers=headers)

def insert_to_supabase(records):
    """Insère un lot de vecteurs dans Supabase via l'API REST."""
    url = f"{SUPABASE_URL}/rest/v1/rag_documents"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    import json
    clean_payload_str = json.dumps(records).replace('\\u0000', '')
    clean_records = json.loads(clean_payload_str)
    
    resp = requests.post(url, json=clean_records, headers=headers)
    if resp.status_code >= 400:
        print(f"❌ Erreur Supabase (Status {resp.status_code}): {resp.text}")
    resp.raise_for_status()

def main():
    print("🚀 Début du scan et de l'ingestion des cours/exercices dans Supabase")
    total_inserted = 0
    
    for config in DIRECTORIES:
        directory = config["path"]
        niveau = config["niveau"]
        
        if not os.path.exists(directory):
            print(f"⚠️ Dossier introuvable : {directory}")
            continue
            
        print(f"\n📂 Scan de : {directory} (Niveau: {niveau})")
        for root, _, files in os.walk(directory):
            for filename in files:
                ext = os.path.splitext(filename)[1].lower()
                if ext not in ['.pdf', '.tex']:
                    continue
                
                # Ignorer les documents administratifs (bulletins, plans de classe, notes...)
                fname_lower = filename.lower()
                exclude_keywords = [
                    'bulletin', 'plan', 'appel', 'liste', 'releve', 'relevé', 'reunion', 'réunion',
                    'parent', 'note', 'trimestre', 'semestre', 'absence', 'punition', 'conseil',
                    'administration', 'administratif', 'edt', 'emploi', 'temps', 'proff', 'bilan', 'trombinoscope'
                ]
                if any(keyword in fname_lower for keyword in exclude_keywords):
                    print(f"🚫 Ignoré (document administratif) : {filename}")
                    continue
                    
                filepath = os.path.join(root, filename)
                print(f"📄 Traitement de {filename}...")
                
                # Supprime le fichier s'il existait déjà dans Supabase pour le réécraser (Idempotence)
                delete_existing_file(filename)
                
                text = extract_text(filepath)
                if not text.strip():
                    continue
                    
                chunks = chunk_text(text)
                batch = []
                
                for i, chunk in enumerate(chunks):
                    # Rate limite
                    time.sleep(2)
                    
                    try:
                        emb = get_embedding(chunk)
                        
                        # Déduire le niveau si auto
                        current_niveau = auto_infer_niveau(filepath) if niveau == "auto" else niveau

                        batch.append({
                            "content": chunk,
                            "metadata": {
                                "type_doc": "cours" if "cours" in filepath.lower() else "exercice",
                                "niveau": current_niveau,
                                "filename": filename,
                                "chunk_idx": i
                            },
                            "embedding": emb
                        })
                        
                        # Insertion par lots de 5
                        if len(batch) >= 5:
                            insert_to_supabase(batch)
                            total_inserted += len(batch)
                            batch = []
                            
                    except Exception as e:
                        print(f"❌ Erreur sur le chunk {i}: {e}")
                        
                # Insérer ce qui reste
                if batch:
                    insert_to_supabase(batch)
                    total_inserted += len(batch)
                    
    print(f"\n🎉 Ingestion terminée ! {total_inserted} vecteurs insérés dans le RAG.")

if __name__ == "__main__":
    main()
