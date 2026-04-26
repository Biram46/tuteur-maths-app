"""
Ingestion des fichiers .tex Terminale dans Supabase (table rag_documents).
Modèle : text-embedding-3-small (1536D) — cohérent avec le reste du projet.
Usage : python scripts/ingest_terminale.py [--dry-run]
"""

import os
import sys
import re
import time
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv('.env.local')

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not all([OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY]):
    print("❌ Clés manquantes dans .env.local (OPENAI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)")
    sys.exit(1)

TERMINALE_DIR = Path(__file__).parent.parent / 'public' / 'resources' / 'terminale'
EMBEDDING_MODEL = 'text-embedding-3-small'
CHUNK_MAX_CHARS = 1200
BATCH_SIZE = 20
DRY_RUN = '--dry-run' in sys.argv

# Mapping nom de fichier → chapitre lisible
CHAPTER_MAP = {
    'limites_cours': 'Limites de suites et de fonctions',
    'limites_exos': 'Limites de suites et de fonctions',
    'derivation_cours': 'Dérivation',
    'derivation_exos': 'Dérivation',
    'integration_cours': 'Intégration',
    'integration_exos': 'Intégration',
    'exponentielle_logarithme_cours': 'Exponentielle et logarithme',
    'exponentielle_logarithme_exos': 'Exponentielle et logarithme',
    'probabilites_cours': 'Probabilités',
    'probabilites_exos': 'Probabilités',
    'nombres_complexes_cours': 'Nombres complexes',
    'nombres_complexes_exos': 'Nombres complexes',
    'geometrie_espace_cours': 'Géométrie dans l\'espace',
    'geometrie_espace_exos': 'Géométrie dans l\'espace',
}


def clean_latex(text: str) -> str:
    """Retire les commandes LaTeX de structure ; garde le contenu mathématique lisible."""
    # Supprimer le préambule documentclass/usepackage/begin{document}/end{document}
    text = re.sub(r'\\documentclass\{[^}]*\}', '', text)
    text = re.sub(r'\\usepackage(\[[^\]]*\])?\{[^}]*\}', '', text)
    text = re.sub(r'\\begin\{document\}|\\end\{document\}', '', text)
    text = re.sub(r'\\maketitle', '', text)
    text = re.sub(r'\\title\{[^}]*\}|\\author\{[^}]*\}', '', text)

    # Garder le contenu des sections/sous-sections
    text = re.sub(r'\\(sub)*section\*?\{([^}]*)\}', r'\n\n=== \2 ===\n', text)

    # Environnements (itemize, enumerate, tabular, center…) : garder contenu
    text = re.sub(r'\\begin\{[^}]*\}|\\end\{[^}]*\}', '', text)
    text = re.sub(r'\\item\s*', '\n• ', text)

    # Commandes de mise en forme basiques
    text = re.sub(r'\\(textbf|textit|emph|text)\{([^}]*)\}', r'\2', text)
    text = re.sub(r'\\(medskip|smallskip|bigskip|noindent|centering|hline)', '', text)
    text = re.sub(r'\\(newpage|clearpage|pagebreak)', '', text)
    text = re.sub(r'\\\\', '\n', text)

    # Garder les formules mathématiques telles quelles (utile pour le RAG)
    # Juste nettoyer les espaces excessifs
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def chunk_text(text: str, max_chars: int = CHUNK_MAX_CHARS) -> list[str]:
    """Découpe en blocs de taille raisonnable en respectant les paragraphes."""
    paragraphs = [p.strip() for p in text.split('\n\n') if len(p.strip()) > 20]
    chunks = []
    current = ''
    for p in paragraphs:
        if len(current) + len(p) > max_chars and current:
            chunks.append(current.strip())
            current = ''
        current += p + '\n\n'
    if current.strip():
        chunks.append(current.strip())
    return chunks


def get_embedding(text: str) -> list[float]:
    """Appelle l'API OpenAI embeddings avec text-embedding-3-small."""
    headers = {
        'Authorization': f'Bearer {OPENAI_API_KEY}',
        'Content-Type': 'application/json',
    }
    payload = {'model': EMBEDDING_MODEL, 'input': text}
    for attempt in range(3):
        try:
            resp = requests.post(
                'https://api.openai.com/v1/embeddings',
                json=payload, headers=headers, timeout=30
            )
            if resp.status_code == 429:
                wait = 10 * (attempt + 1)
                print(f'  Rate limit OpenAI, attente {wait}s...')
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()['data'][0]['embedding']
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(3)


def delete_existing(filename: str):
    """Supprime les chunks existants pour ce fichier (mise à jour propre)."""
    url = f"{SUPABASE_URL}/rest/v1/rag_documents?metadata->>filename=eq.{filename}"
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
    }
    resp = requests.delete(url, headers=headers)
    if resp.status_code not in (200, 204):
        print(f'  AVERTISSEMENT: Suppression echouee ({resp.status_code}): {resp.text[:100]}')


def insert_batch(records: list[dict]):
    """Insère un lot dans Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/rag_documents"
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
    }
    # Nettoyer les caractères nuls qui posent problème à PostgreSQL
    payload_str = json.dumps(records).replace('\\u0000', '')
    clean_records = json.loads(payload_str)
    resp = requests.post(url, json=clean_records, headers=headers)
    if resp.status_code >= 400:
        print(f'  ERREUR Supabase ({resp.status_code}): {resp.text[:200]}')
        resp.raise_for_status()


def process_file(tex_path: Path) -> int:
    """Traite un fichier .tex et insère ses chunks. Retourne le nombre de chunks insérés."""
    stem = tex_path.stem  # ex: 'limites_cours'
    doc_type = 'exercices' if stem.endswith('_exos') else 'cours'
    chapter = CHAPTER_MAP.get(stem, stem.replace('_', ' ').title())
    filename = tex_path.name

    raw = tex_path.read_text(encoding='utf-8', errors='ignore')
    cleaned = clean_latex(raw)
    chunks = chunk_text(cleaned)

    if not chunks:
        print(f'  AVERTISSEMENT: Aucun chunk extrait de {filename}')
        return 0

    print(f'  -> {len(chunks)} chunks', end='')

    if DRY_RUN:
        print(" [dry-run, pas d'insertion]")
        return len(chunks)

    # Supprimer les anciens chunks de ce fichier
    delete_existing(filename)

    # Préparer les records par batch
    records = []
    for i, chunk in enumerate(chunks):
        try:
            embedding = get_embedding(chunk)
        except Exception as e:
            print(f'\n  ERREUR: Embedding echoue chunk {i}: {e}')
            continue

        records.append({
            'content': chunk,
            'embedding': embedding,
            'metadata': {
                'filename': filename,
                'niveau': 'terminale',
                'chapitre': chapter,
                'type': doc_type,
                'chunk_index': i,
                'source': f'public/resources/terminale/{filename}',
            },
        })

        # Insérer par batch
        if len(records) >= BATCH_SIZE:
            insert_batch(records)
            records = []
            time.sleep(0.3)

    if records:
        insert_batch(records)

    print(' OK')
    return len(chunks)


def main():
    if DRY_RUN:
        print('[dry-run] Aucune insertion Supabase\n')

    tex_files = sorted(TERMINALE_DIR.glob('*.tex'))
    if not tex_files:
        print(f'ERREUR: Aucun fichier .tex dans {TERMINALE_DIR}')
        sys.exit(1)

    print(f'{len(tex_files)} fichiers .tex trouves dans {TERMINALE_DIR}\n')

    total = 0
    for tex_path in tex_files:
        print(f'  {tex_path.name}')
        n = process_file(tex_path)
        total += n

    print(f'\nTermine : {total} chunks {"prepares (dry-run)" if DRY_RUN else "inseres dans Supabase"}')


if __name__ == '__main__':
    main()
