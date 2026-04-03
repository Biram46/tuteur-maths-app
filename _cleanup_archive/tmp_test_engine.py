import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = 'http://localhost:3000/api/math-engine'
data = json.dumps({
    'type': 'variation_table',
    'expression': 'x^3 - 3/2 x^2 - 6x + 5',
    'niveau': 'terminale-specialite',
    'options': {'searchDomain': [-5, 5]}
}).encode('utf-8')
headers = {'Content-Type': 'application/json'}
req = urllib.request.Request(url, data=data, headers=headers, method='POST')

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        print(response.read().decode('utf-8'))
except Exception as e:
    print(f"Error: {e}")
