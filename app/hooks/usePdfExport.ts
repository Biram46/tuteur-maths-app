'use client';

import { useCallback } from 'react';
import type { ChatMessage } from '@/lib/perplexity';

// ─── Hook usePdfExport ────────────────────────────────────────────────────────

export function usePdfExport(
    messages: ChatMessage[],
    setLoading: (v: boolean) => void
) {
    const handleExportBilan = useCallback(async () => {
        if (messages.length === 0) return;

        try {
            setLoading(true);

            // ── KaTeX via CDN (chemins de fonts absolus, fiables en blob URL) ──
            const katexLinks = [
                '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />',
            ];

            // ── Construire le HTML des messages ──
            let messagesHtml = '';
            for (let i = 0; i < messages.length; i++) {
                const msgEl = document.getElementById(`msg-${i}`);
                if (!msgEl) continue;

                const role = messages[i].role;
                const roleLabel = role === 'user' ? 'ÉLÈVE' : 'MIMIMATHS@I — ASSISTANT';
                const roleBg = role === 'user' ? '#f0f9ff' : '#ffffff';
                const roleBorder = role === 'user' ? '#bae6fd' : '#e2e8f0';

                const clone = msgEl.cloneNode(true) as HTMLElement;
                clone.querySelectorAll('button').forEach(b => b.remove());
                clone.querySelectorAll('[class*="avatar"], [class*="Avatar"], [class*="robot"]').forEach(a => a.remove());

                messagesHtml += `
          <div class="msg-block">
            <div class="role-label">${roleLabel}</div>
            <div class="msg-content" style="background:${roleBg};border:1px solid ${roleBorder};">
              ${clone.innerHTML}
            </div>
          </div>`;
            }

            const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
            const timeStr = new Date().toLocaleString('fr-FR');

            const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Bilan Pédagogique - mimimaths@i</title>
${katexLinks.join('\n')}
<style>
@page { size: A4; margin: 18mm 15mm 22mm 15mm; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print, .print-btn { display: none !important; }
}
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 11pt; color: #0f172a; line-height: 1.55; margin: 0; padding: 0; background: #fff; }
.print-header { text-align: center; border-bottom: 3px solid #22d3ee; padding-bottom: 14px; margin-bottom: 22px; }
.print-header h1 { font-size: 22pt; font-weight: 800; color: #0f172a; margin: 0 0 5px; letter-spacing: 0.03em; }
.print-header .sub { font-size: 9pt; color: #64748b; }
.msg-block { margin-bottom: 14px; page-break-inside: avoid; }
.role-label { font-size: 8pt; color: #64748b; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 3px; }
.msg-content { border-radius: 6px; padding: 12px 16px; color: #000 !important; }
.msg-content * { color: #000 !important; }
.katex { color: #000 !important; }
.katex-display { margin: 0.7em 0 !important; }
svg { max-width: 100% !important; height: auto !important; overflow: visible !important; }
svg foreignObject { overflow: visible !important; }
.katex .sqrt .hide-tail { visibility: visible !important; }
.katex .sqrt > .root { overflow: visible !important; }
strong, b { font-weight: 700; }
h2, h3, h4 { margin-top: 0.8em; margin-bottom: 0.3em; }
ul, ol { margin: 0.4em 0; padding-left: 1.5em; }
li { margin-bottom: 0.15em; }
code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 0.9em; }
blockquote { border-left: 3px solid #94a3b8; margin: 0.5em 0; padding: 0.3em 0 0.3em 12px; color: #374151; }
img { max-width: 100%; height: auto; }
.print-footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 7pt; color: #94a3b8; padding: 4px 0; border-top: 1px solid #e2e8f0; }
.print-btn { display: block; margin: 16px auto; padding: 12px 32px; background: #22d3ee; color: #fff; font-size: 14pt; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">📄 Enregistrer en PDF</button>
<div class="print-header">
  <h1>BILAN PÉDAGOGIQUE</h1>
  <div class="sub">mimimaths@i · Rapport d'apprentissage · ${dateStr}</div>
</div>
${messagesHtml}
<div class="print-footer">mimimaths@i · ${timeStr}</div>
</body>
</html>`;

            // ── Ouvrir dans un nouvel onglet ──
            const blob = new Blob([fullHtml], { type: 'text/html; charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);
            const printWin = window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);

            if (!printWin) {
                // Popup bloquée → téléchargement direct
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = 'bilanmath.html';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            }

        } catch (error) {
            console.error('Erreur PDF:', error);
            alert('Erreur lors de la génération du PDF.');
        } finally {
            setLoading(false);
        }
    }, [messages, setLoading]);

    return { handleExportBilan };
}
