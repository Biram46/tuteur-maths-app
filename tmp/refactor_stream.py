import re

with open('app/hooks/useMathRouter.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Make sure we add the import at the top
if 'streamPerplexityResponse' not in code:
    import_statement = "import { streamPerplexityResponse } from '@/lib/math-router/stream-handler';\n"
    code = re.sub(r"(import \{[^}]+\} from '@/lib/math-router/math-text-utils';)", r"\1\n" + import_statement, code, count=1)


# We want to replace the ENTIRE try-catch-finally block in startStreamingResponse!
# It starts at: `try {`
# const response = await fetch('/api/perplexity', ...
# and ends at:
#            setIsTalking(false);
#        } finally {
#            setLoading(false);
#        }
# We can regex from `try\s*\{\s*const response.*?fetch\('/api/perplexity'`
# to `setLoading\(false\);\s*\}`

block1_pattern = r"try\s*\{\s*const response.*?fetch\('/api/perplexity'[\s\S]*?body:\s*JSON\.stringify\(\{\s*messages:\s*msgs,\s*context:\s*baseContext\s*\}\),\s*\}\);[\s\S]*?\n\s*\}\s*catch\s*\([^)]+\)\s*\{[\s\S]*?setIsTalking\(false\);\s*\}\s*finally\s*\{[\s\S]*?setLoading\(false\);\s*\}"

block1_replacement = """await streamPerplexityResponse({
            messages: msgs,
            baseContext,
            setMessages,
            setLoading,
            setIsTalking,
            isVoiceEnabled,
            speechQueue,
            processSpeechQueue
        });"""

code = re.sub(block1_pattern, block1_replacement, code)

with open('app/hooks/useMathRouter.ts.new', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done. Syntactically valid block 1 replaced.")
