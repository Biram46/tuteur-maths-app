import urllib.request
import re
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'https://eduscol.education.fr/203/programmes-et-ressources-en-mathematiques-voie-generale-et-technologique'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        html = response.read().decode('utf-8')
        links = re.findall(r'href=[\'\"]([^\'\"]+\.pdf)[\'\"]', html)
        result_links = []
        for link in set(links):
            if 'math' in link.lower() or 'programme' in link.lower() or 'spe' in link.lower():
                final_un = link if link.startswith('http') else 'https://eduscol.education.fr' + link
                result_links.append(final_un)
        for link in sorted(result_links):
            print(link)
except Exception as e:
    print('Failed:', e)
