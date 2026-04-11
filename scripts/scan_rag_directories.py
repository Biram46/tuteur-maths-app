import os
from collections import defaultdict
import json

directories = [
    r"D:\AI\lycee\1spé\cours",
    r"D:\AI\lycee\seconde\cours",
    r"D:\annee 25 26"
]

results = {}

for root_dir in directories:
    if not os.path.exists(root_dir):
        print(f"NOT FOUND: {root_dir}")
        continue
        
    ext_counts = defaultdict(int)
    total_size = 0
    file_count = 0
    
    for dirpath, _, filenames in os.walk(root_dir):
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if not ext:
                ext = "no_extension"
            ext_counts[ext] += 1
            file_count += 1
            
            try:
                total_size += os.path.getsize(os.path.join(dirpath, name))
            except Exception:
                pass
                
    results[root_dir] = {
        "files": file_count,
        "extensions": dict(ext_counts),
        "size_mb": round(total_size / (1024 * 1024), 2)
    }

print(json.dumps(results, indent=2))
