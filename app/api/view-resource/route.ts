
import { NextRequest, NextResponse } from "next/server";
import { isUrlSafe } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
        return new NextResponse("URL parameter is missing", { status: 400 });
    }

    // Protection SSRF : valider l'URL avant de la proxyfier
    const urlCheck = isUrlSafe(url);
    if (!urlCheck.safe) {
        return new NextResponse(`URL non autorisée : ${urlCheck.reason}`, { status: 403 });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return new NextResponse(`Error fetching resource: ${response.statusText}`, {
                status: response.status,
            });
        }

        const lowerUrl = url.toLowerCase();
        const isHtml = lowerUrl.endsWith(".html") || lowerUrl.endsWith(".htm");

        // Injecter les boutons dans les exercices HTML interactifs
        if (isHtml) {
            let html = await response.text();

            // Injecter uniquement si les boutons ne sont pas déjà présents
            if (!html.includes('btn-envoyer')) {
                const injection = `
<style>
  #bloc-envoi { text-align:center; margin: 20px auto; font-family: system-ui, sans-serif; }
  #btn-envoyer-prof { display:none; margin: 12px auto; padding: 14px 32px; background: #2563eb; color: white; border: none; border-radius: 10px; font-size: 1rem; font-weight: bold; cursor: pointer; }
  #btn-envoyer-prof:hover { background: #1d4ed8; }
  #msg-envoye { display:none; color:#16a34a; font-weight:bold; margin-top:10px; font-size:1rem; }
</style>
<div id="bloc-envoi">
  <button id="btn-envoyer-prof" onclick="envoyerResultatProf()">📤 Envoyer mes résultats au professeur</button>
  <div id="msg-envoye">✅ Résultats envoyés au professeur !</div>
</div>
<script>
  // Rendre le bouton visible dès qu'un résultat est affiché
  (function() {
    var _noteInterceptee = null;
    var _surInterceptee = 20;

    // Intercepter postMessage sortant existant
    var _origPostMessage = window.parent.postMessage.bind(window.parent);
    var _patchedPost = function(data, origin) {
      if (data && data.type === 'quiz-result') {
        _noteInterceptee = data.note;
        _surInterceptee = data.sur || 20;
        // Ne pas envoyer automatiquement — attendre le bouton
        document.getElementById('btn-envoyer-prof').style.display = 'inline-block';
        document.getElementById('btn-envoyer-prof').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      _origPostMessage(data, origin);
    };
    try { window.parent.postMessage = _patchedPost; } catch(e) {}

    // Observer le DOM pour détecter l'affichage du résultat (#resultat visible)
    var obs = new MutationObserver(function() {
      var el = document.getElementById('resultat');
      if (el && el.style.display !== 'none' && el.innerHTML.trim() !== '') {
        document.getElementById('btn-envoyer-prof').style.display = 'inline-block';
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

    window.envoyerResultatProf = function() {
      var note = _noteInterceptee;
      // Si on n'a pas intercepté via postMessage, lire depuis le DOM
      if (note === null) {
        var el = document.getElementById('resultat');
        if (el) {
          var m = el.textContent.match(/(\\d+(?:[.,]\\d+)?)\\s*\\/\\s*(\\d+)/);
          if (m) { note = parseFloat(m[1].replace(',','.')); _surInterceptee = parseInt(m[2]); }
        }
      }
      if (window.parent !== window.self) {
        window.parent.postMessage({ type: 'quiz-result', note: note || 0, sur: _surInterceptee }, '*');
      }
      document.getElementById('btn-envoyer-prof').style.display = 'none';
      document.getElementById('msg-envoye').style.display = 'block';
    };
  })();
</script>`;
                // Injecter avant </body>
                if (html.includes('</body>')) {
                    html = html.replace('</body>', injection + '\n</body>');
                } else {
                    html += injection;
                }
            }

            return new NextResponse(html, {
                headers: {
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-store",
                },
            });
        }

        const buffer = await response.arrayBuffer();
        let finalContentType = "application/octet-stream";
        if (lowerUrl.endsWith(".pdf")) {
            finalContentType = "application/pdf";
        } else {
            const ct = response.headers.get("content-type");
            if (ct) finalContentType = ct;
        }

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": finalContentType,
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Error in view-resource proxy:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
