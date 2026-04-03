import sys, re

file_path = 'app/hooks/useMathRouter.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ADD IMPORTS at the top
imports = """import { patchMarkdownTables, deLatexInput, cleanMathExpr, prettifyExpr, stripDdx, cleanExprForGraph, prettifyMath, GRAPH_COLORS } from '@/lib/math-router/math-text-utils';
import { buildExerciceQuestionPrompt, buildNiveauConstraints, buildSignTableInstructions, buildGeometrySystemPrompt, buildProbabilitySystemPrompt } from '@/lib/math-router/prompt-builders';
"""
if "import { patchMarkdownTables" not in content:
    content = content.replace("import { ChatMessage } from '@/lib/perplexity';", "import { ChatMessage } from '@/lib/perplexity';\n" + imports)

# 2. REMOVE patchMarkdownTables
content = re.sub(r'function patchMarkdownTables\(content: string\): string \{.*?\n\}\n', '', content, flags=re.DOTALL)

# 3. REMOVE deLatexInput
content = re.sub(r'\n\s*const deLatexInput = \(s: string\): string => \{.*?\n\s*\};\n', '\n', content, flags=re.DOTALL)

# 4. REMOVE cleanMathExpr
content = re.sub(r'\n\s*const cleanMathExpr = \(e: string\): string => \{.*?\n\s*\};\n', '\n', content, flags=re.DOTALL)

# 5. REMOVE prettifyExpr
content = re.sub(r'\n\s*const prettifyExpr = \(ex: string\): string => \{.*?\n\s*\};\n', '\n', content, flags=re.DOTALL)

# 6. REMOVE buildExerciceQuestionPrompts
content = re.sub(r'\n\s*const buildExerciceQuestionPrompts = \(.*?\n\s*\};\n', '\n', content, flags=re.DOTALL)

# 7. REMOVE stripDdx
content = re.sub(r'\n\s*const stripDdx = \(t: string\): string => \{.*?\n\s*\};\n', '\n', content, flags=re.DOTALL)

# 8. REMOVE GRAPH_COLORS array declarations
content = re.sub(r'\n\s*const GRAPH_COLORS = \[\'#38bdf8\'.*?\];\n', '\n', content, flags=re.DOTALL)

# 9. REMOVE prettifyMath
content = re.sub(r'\n\s*const prettifyMath = \(expr: string\): string => \{.*?\n\s*\};\n', '\n', content, flags=re.DOTALL)

# 10. REMOVE cleanExpr
content = re.sub(r'\n\s*const cleanExpr = \(e: string\) => \{.*?\n\s*\};\n', '\n', content, flags=re.DOTALL)

# 11. Rename cleanExpr to cleanExprForGraph where it was used
content = content.replace('cleanExpr(', 'cleanExprForGraph(')

# REWRITE PROMPT BUILDERS BLOCKS

# 12. Exercise Question Prompts
ex_q_old = r'const aiSystemPrompt = `\[EXERCICE DE MATHS\][\s\S]*?\}'
def repl_ex_q(m):
    return """const niveauConst = buildNiveauConstraints(exerciceNiveau, niveauLabel);
            const buildPrompts = () => {
                const parts: string[] = [];
                for (const q of questions) {
                    parts.push(buildExerciceQuestionPrompt(q, signCtx, hasStudyDerivSign, hasStudyVarTable));
                }
                return parts.join('\\n\\n');
            };
            const aiSystemPrompt = `[EXERCICE DE MATHS] L'élève étudie l'expression suivante :\nf(x) = ${exprClean}\nTu DOIS répondre question par question.
\\n${niveauConst}\\n
Voici les consignes pour chaque sous-question :
${buildPrompts()}`;"""
# Try replacing with exact bounds if needed, but python logic here is simpler
content = re.sub(r'const niveauConstraints = \(\(\) => \{[\s\S]*?return parts\.join\(\'\\n\\n\'\);\s*\n\s*\}\)\(\);[\s\S]*?Voici les consignes pour chaque sous-question :\n\s*\$\{buildExerciceQuestionPrompts\(\)\}\`;', repl_ex_q(None), content, count=1)

# 13. buildSignTableInstructions
# We replace the IIFE that generates the `sign_table` text.
content = re.sub(
    r'\(\(\) => \{\n\s+const parts: string\[\] = \[\];[\s\S]*?return parts\.join\(\'\\n\'\);\n\s*\}\)\(\)',
    r'buildSignTableInstructions(engineData, expr, tableBlock, inputText)',
    content
)

# 14. buildGeometrySystemPrompt
# Replace previousContext and geoSystemPrompt
content = re.sub(
    r'let previousGeoBlock = \'\';[\s\S]*?Après le bloc @@@, explique brièvement la figure et les propriétés utilisées\.`;',
    r'let previousGeoBlock = \'\';\n                if (isFollowUp) {\n                    try {\n                        const keys = Object.keys(localStorage).filter(k => k.startsWith(\'geo_scene_\')).sort();\n                        if (keys.length > 0) {\n                            const lastScene = JSON.parse(localStorage.getItem(keys[keys.length - 1]) || \'{}\');\n                            if (lastScene.raw) previousGeoBlock = lastScene.raw;\n                        }\n                    } catch { /* ignore */ }\n                } else {\n                    try { Object.keys(localStorage).filter(k => k.startsWith(\'geo_scene_\')).forEach(k => localStorage.removeItem(k)); } catch { }\n                }\n                const geoSystemPrompt = buildGeometrySystemPrompt(previousGeoBlock);',
    content
)

# 15. buildProbabilitySystemPrompt
content = re.sub(
    r'const treeSystemPrompt = `\[SYSTÈME ARBRE DE PROBABILITÉS\][\s\S]*?Après le bloc @@@, explique brièvement l\'arbre et les propriétés utilisées\.`;',
    r'const treeSystemPrompt = buildProbabilitySystemPrompt(isBinomialLargeN, nRep);',
    content
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patching complete!")
