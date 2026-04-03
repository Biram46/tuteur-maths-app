const ROW_H = 50;
const xValues = ['-inf', '0', '1', '+inf'];
const N = xValues.length;

function isForbidden(v: string) { return v === '||'; }
function isArrow(v: string) { return /nearrow|searrow/i.test(v); }

// Test f'(x)
const signContent = ['-', '||', '-', '0', '+'];
console.log("=== SIGN f'(x) ===");
signContent.forEach((val, idx) => {
    const halfIdx = idx + 1;
    const isXValueCol = halfIdx % 2 === 0;
    if (isXValueCol) {
        console.log(`Point x=${xValues[(halfIdx/2)-1]} (halfIdx=${halfIdx}): rend ${val}`);
    } else {
        console.log(`Intervalle (halfIdx=${halfIdx}): rend ${val}`);
    }
});

// Test f(x)
const varContent = ['0', 'searrow', '-9999', '||', '+inf', 'searrow', '2.72', 'nearrow', '+inf'];
console.log("\n=== VARIATION f(x) ===");
const valAtXk = new Array(N).fill(null);
const arrowAtInterval = new Array(N - 1).fill(null);
const forbiddenAt = new Array(N).fill(false);

let tokenIdx = 0;
for (let xIdx = 0; xIdx < N && tokenIdx < varContent.length; xIdx++) {
    const tok = varContent[tokenIdx];
    if (isForbidden(tok)) {
        forbiddenAt[xIdx] = true;
        valAtXk[xIdx] = '||';
        tokenIdx++;
    } else if (isArrow(tok)) {
        // ...
    } else {
        if (tokenIdx + 1 < varContent.length && isForbidden(varContent[tokenIdx + 1])) {
            valAtXk[xIdx] = tok; 
            forbiddenAt[xIdx] = true;
            tokenIdx += 2;
            if (tokenIdx < varContent.length && !isArrow(varContent[tokenIdx])) {
                tokenIdx++; // limitRight
            }
        } else {
            valAtXk[xIdx] = tok;
            tokenIdx++;
        }
    }
    if (xIdx < N - 1 && tokenIdx < varContent.length) {
        if (isArrow(varContent[tokenIdx])) {
            arrowAtInterval[xIdx] = varContent[tokenIdx];
            tokenIdx++;
        }
    }
}
console.log("valAtXk:", valAtXk);
console.log("forbiddenAt:", forbiddenAt);
console.log("arrowAtInterval:", arrowAtInterval);
