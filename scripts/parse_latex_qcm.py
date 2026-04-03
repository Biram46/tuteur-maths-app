import re
import json
import sys
import os
import glob
import uuid

def parse_sujet(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    part1_match = re.search(r'\\section\*?\{Partie 1.*?\}', content)
    if not part1_match:
        return []
        
    part2_match = re.search(r'\\section\*?\{Partie 2.*?\}', content[part1_match.end():])
    end_pos = part1_match.end() + part2_match.start() if part2_match else len(content)
    
    auto_text = content[part1_match.end():end_pos]
    
    enum_match = re.search(r'\\begin\{enumerate\}(.*?)\\end\{enumerate\}', auto_text, re.DOTALL)
    if not enum_match:
        return []
    
    enum_text = enum_match.group(1)
    
    items_raw = re.split(r'\\item(?!\s*\[)', enum_text)
    items_raw = [it.strip() for it in items_raw if it.strip()]
    
    questions = []
    
    for idx, raw in enumerate(items_raw):
        itemize_match = re.search(r'\\begin\{itemize\}(.*?)\\end\{itemize\}', raw, re.DOTALL)
        if itemize_match:
            q_text = raw[:itemize_match.start()].strip()
            options_text = itemize_match.group(1)
            
            options = []
            opt_matches = re.finditer(r'\\item\[([A-D])\.?\]\s*(.*?)(?=\\item\[|\Z)', options_text, re.DOTALL | re.IGNORECASE)
            for m in opt_matches:
                options.append(m.group(2).strip())
                
            questions.append({
                "question": q_text,
                "options": options
            })
    return questions

def parse_corrige(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    part1_match = re.search(r'\\section\*?\{Partie 1.*?\}', content)
    if not part1_match:
        return []
        
    part2_match = re.search(r'\\section\*?\{Partie 2.*?\}', content[part1_match.end():])
    end_pos = part1_match.end() + part2_match.start() if part2_match else len(content)
    
    auto_text = content[part1_match.end():end_pos]
    
    enum_match = re.search(r'\\begin\{enumerate\}(.*?)\\end\{enumerate\}', auto_text, re.DOTALL)
    if not enum_match:
        return []
    
    enum_text = enum_match.group(1)
    
    items_raw = re.split(r'\\item(?!\s*\[)', enum_text)
    items_raw = [it.strip() for it in items_raw if it.strip()]
    
    corriges = []
    
    for raw in items_raw:
        ans_match = re.search(r'\\boxed\{([A-D])\}', raw, re.IGNORECASE)
        answer_letter = ans_match.group(1).upper() if ans_match else None
        
        exp_text = re.sub(r'\\textbf\{Réponse\s*:?\s*\}', '', raw, flags=re.IGNORECASE)
        exp_text = re.sub(r'\\boxed\{[A-D]\}', '', exp_text, flags=re.IGNORECASE).strip()
        
        corriges.append({
            "answer_letter": answer_letter,
            "explanation": exp_text
        })
        
    return corriges

if __name__ == "__main__":
    sujet_files = glob.glob('public/eam/sujets/*_sujet.tex')
    
    all_questions = []
    letter_to_index = {"A": 0, "B": 1, "C": 2, "D": 3}
    
    for sujet_path in sujet_files:
        corrige_path = sujet_path.replace('_sujet.tex', '_corrige.tex')
        prefix = os.path.basename(sujet_path).replace('_sujet.tex', '')
        
        if not os.path.exists(corrige_path):
            continue
            
        questions = parse_sujet(sujet_path)
        corriges = parse_corrige(corrige_path)
        
        for i, q in enumerate(questions):
            q["id"] = f"{prefix}-qcm-{i+1}"
            
            # Simple heuristic for category based on question text
            text_lower = q["question"].lower()
            if "probabilit" in text_lower or "au hasard" in text_lower or "urne" in text_lower:
                category = "Probabilités"
            elif "pourcentage" in text_lower or "évolution" in text_lower or "baisse" in text_lower or "hausse" in text_lower:
                category = "Évolutions et variations"
            elif "foction" in text_lower or "fonction" in text_lower or "dériv" in text_lower or "tableau de signe" in text_lower:
                category = "Fonctions"
            elif "médiane" in text_lower or "moyenne" in text_lower or "quartile" in text_lower or "série" in text_lower:
                category = "Statistiques"
            else:
                category = "Calcul numérique et algébrique"
                
            q["category"] = category
            
            if i < len(corriges):
                corr = corriges[i]
                if corr["answer_letter"] in letter_to_index:
                    q["correctAnswerIndex"] = letter_to_index[corr["answer_letter"]]
                else:
                    q["correctAnswerIndex"] = -1
                q["explanation"] = corr["explanation"]
            else:
                q["correctAnswerIndex"] = -1
                q["explanation"] = ""
                
            all_questions.append(q)
            
    with open('tmp_all_qcms.json', 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, indent=4, ensure_ascii=False)
    print(f"Extracted {len(all_questions)} questions to tmp_all_qcms.json")
