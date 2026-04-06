import re

with open('app/hooks/useMathRouter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# We look for blocks starting with: try { const response = await fetch('/api/perplexity'
matches = list(re.finditer(r"try\s*\{\s*const\s+response\s*=\s*await\s+fetch\('/api/perplexity'[\s\S]*?body:\s*JSON\.stringify\(.*?\)\s*,?\s*\}\);[\s\S]*?(?:return;|\}\s*finally)", code))

print(f"Found {len(matches)} blocks starting with try {{ const response = await fetch('/api/perplexity'.")

for i, m in enumerate(matches):
    print(f"--- Block {i+1} ---")
    start_index = m.start()
    end_index = m.end()
    text = m.group(0)
    print(f"Line approx {code[:start_index].count(chr(10))} to {code[:end_index].count(chr(10))}")
    print("Variables/patterns inside block:")
    if "replace(/\[TABLE_SIGNES\]" in text: print("- Has TABLE_SIGNES replacement")
    if "setMessages(prev" in text: print(f"- Has setMessages ({text.count('setMessages')} times)")
    if "fixLatexContent" in text: print("- Has fixLatexContent")
    if "stripDdx" in text: print("- Has stripDdx")
    
