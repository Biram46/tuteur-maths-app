import fitz
import glob
import os
import json

pdf_dir = r"C:\Users\HP\Documents\projet\programmes du lycee"
pdfs = glob.glob(os.path.join(pdf_dir, "*.pdf"))

data = {}

for pdf in pdfs:
    print(f"Reading {pdf}...")
    try:
        doc = fitz.open(pdf)
        text = ""
        for page in doc:
            text += page.get_text("text") + "\n"
        
        # Clean up text a bit
        text = " ".join(text.split())
        
        basename = os.path.basename(pdf).replace(".pdf", "")
        data[basename] = text
    except Exception as e:
        print(f"Error reading {pdf}: {e}")

out_path = r"C:\Users\HP\Documents\projet\tuteur-maths-app\lib\programmes-raw.ts"
print(f"Writing to {out_path}...")

with open(out_path, "w", encoding="utf-8") as f:
    f.write("export const RAW_PROGRAMMES = ")
    json.dump(data, f, ensure_ascii=False, indent=4)
    f.write(";\n")

print("Done!")
