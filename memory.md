# Projet analysis
## Project Summary
Application de tutorat mathématique with next.js 16, React 19, TypeScript

- **Math Router**:** système de routing math questions toward appropriate engines
    - `lib/math-router/router.ts` - main router logic
    - `lib/math-router/intent-detector.ts` - intent detection
    - `lib/math-router/math-text-utils.ts` - text utils (LaTeX, expressions)
    - `lib/math-router/prompt-builders.ts` - prompts for AI tutoring
    - `lib/math-router/handlers-utils.ts` - pure functions for handlers

- `app/hooks/useMathRouter.ts` - main React hook (~2477 lines, reduced from ~2500)

- **Refactoring Completed:**
    - Removed duplicate `stripDdx` function (using imported version)
    - Replaced inline `prettyName` creation with `prettifyExprForDisplay` (3 occurrences)
    - Removed duplicate `GRAPH_COLORS` import
    - Added new utility functions to `handlers-utils.ts`:
        - `createSingleCurveGraphState` - creates GraphState for single expression
        - `extractIntervalFromText` - extracts interval [a, b] from text
        - `normalizeExprForSymPy` - normalizes expressions for Python API
        - `normalizeExprForMathJS` - normalizes expressions for mathjs
        - `cleanExprText` - removes parasitic text around expressions

- **Files to clean up (untracked):**
    - `scripts/` - temp files (patch-*.js, test*.js)
    - `tmp/` directory
    - `test_*.ts` files in root

- **Next steps:**
    - Continue extracting inline expression cleaning logic
    - Extract full handlers into separate modules (exercise, study function, graph, geometry)
    - Clean up temporary files
    - Commit changes
