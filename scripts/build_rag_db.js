/**
 * build_rag_db.js
 * 
 * Script pour peupler la table rag_documents de Supabase avec les embeddings
 * des programmes officiels de maths.
 * 
 * Usage: node scripts/build_rag_db.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Config ──────────────────────────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY) { console.error("❌ OPENAI_API_KEY manquant"); process.exit(1); }
if (!SUPABASE_URL)   { console.error("❌ NEXT_PUBLIC_SUPABASE_URL manquant"); process.exit(1); }
if (!SUPABASE_SERVICE_KEY) { console.error("❌ SUPABASE_SERVICE_ROLE_KEY manquant"); process.exit(1); }

// ── Mapping niveaux ─────────────────────────────────────────────────────────
const LEVEL_MAP = {
    "programme_maths_1spe": { niveau: "1spe", label: "Première Spécialité" },
    "programme_maths_premiers_stmg": { niveau: "1stmg", label: "Première STMG" },
    "programme_maths_seconde": { niveau: "seconde", label: "Seconde" },
    "programme_maths_terminale_maths complementaire": { niveau: "tle_comp", label: "Terminale Maths Complémentaires" },
    "programme_maths_terminale_option maths expert": { niveau: "tle_expert", label: "Terminale Maths Expertes" },
    "programme_maths_terminale_specialite": { niveau: "tle_spe", label: "Terminale Spécialité" },
    "programme_maths_terminale_techno_STMG": { niveau: "tle_stmg", label: "Terminale STMG" },
};

// ── Read raw programmes ─────────────────────────────────────────────────────
const rawPath = path.join(__dirname, '../lib/programmes-raw.ts');
let content = fs.readFileSync(rawPath, 'utf-8');
// Parse the exported object
content = content.replace(/^export\s+const\s+RAW_PROGRAMMES\s*=\s*/, '').replace(/;\s*$/, '');
const rawProgrammes = JSON.parse(content);

// ── Chunk text ──────────────────────────────────────────────────────────────
function chunkText(text, maxChars = 1200) {
    const chunks = [];
    let currentChunk = "";
    // Split on double newline or section markers
    const paragraphs = text.split(/\n\s*\n|(?=©\s*Ministère)/g).filter(p => p.trim().length > 20);
    
    for (const p of paragraphs) {
        if (currentChunk.length + p.length > maxChars && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
        }
        currentChunk += p + "\n";
    }
    if (currentChunk.trim().length > 50) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
}

// ── OpenAI Embedding ────────────────────────────────────────────────────────
async function getEmbedding(text) {
    const payload = JSON.stringify({ input: text, model: "text-embedding-ada-002" });
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.openai.com',
            path: '/v1/embeddings',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                const j = JSON.parse(d);
                if (j.error) reject(new Error(j.error.message));
                else resolve(j.data[0].embedding);
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ── Supabase Insert ─────────────────────────────────────────────────────────
async function insertToSupabase(records) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rag_documents`);
    
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(records);
        const parsedUrl = new URL(url);
        
        const req = https.request({
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname,
            method: 'POST',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Supabase Insert Error ${res.statusCode}: ${data.substring(0, 300)}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ── Clear existing data ─────────────────────────────────────────────────────
async function clearExistingData() {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rag_documents`);
    // Delete all rows
    url.searchParams.set('id', 'not.is.null');

    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        
        const req = https.request({
            hostname: parsedUrl.hostname,
            path: `${parsedUrl.pathname}?${parsedUrl.searchParams.toString()}`,
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Supabase Delete Error ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
    console.log("🧹 Suppression des anciennes données RAG...");
    await clearExistingData();
    console.log("✅ Table nettoyée.\n");

    let totalInserted = 0;
    const BATCH_SIZE = 5; // Insert par lots de 5 pour éviter les timeouts

    for (const [levelKey, text] of Object.entries(rawProgrammes)) {
        const levelInfo = LEVEL_MAP[levelKey] || { niveau: levelKey, label: levelKey };
        console.log(`📚 Traitement du programme: ${levelInfo.label} (${levelKey})`);
        
        const chunks = chunkText(text, 1200);
        console.log(`   ${chunks.length} chunks générés`);

        let batch = [];

        for (let i = 0; i < chunks.length; i++) {
            try {
                process.stdout.write(`   Embedding chunk ${i + 1}/${chunks.length}...`);
                const embedding = await getEmbedding(chunks[i]);
                
                batch.push({
                    content: chunks[i],
                    metadata: {
                        niveau: levelInfo.niveau,
                        label: levelInfo.label,
                        source_key: levelKey,
                        chunk_index: i,
                        total_chunks: chunks.length
                    },
                    embedding: `[${embedding.join(',')}]`
                });

                console.log(" ✅");

                // Insert batch when full
                if (batch.length >= BATCH_SIZE) {
                    await insertToSupabase(batch);
                    totalInserted += batch.length;
                    console.log(`   💾 Lot de ${batch.length} inséré (total: ${totalInserted})`);
                    batch = [];
                }

                // Rate limiting: 4000ms between API calls with Gemini
                await new Promise(r => setTimeout(r, 4000));
            } catch (e) {
                console.log(` ❌ Erreur: ${e.message}`);
            }
        }

        // Insert remaining batch
        if (batch.length > 0) {
            await insertToSupabase(batch);
            totalInserted += batch.length;
            console.log(`   💾 Lot final de ${batch.length} inséré (total: ${totalInserted})`);
        }

        console.log(`   ✅ ${levelInfo.label} terminé.\n`);
    }

    console.log(`\n🎉 RAG DB peuplée avec succès: ${totalInserted} vecteurs insérés dans Supabase !`);
}

main().catch(err => {
    console.error("❌ Erreur fatale:", err);
    process.exit(1);
});
