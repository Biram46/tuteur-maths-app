import urllib.request
import json
req = urllib.request.Request('http://127.0.0.1:5000/sign-table', 
    data=json.dumps({"expression": "e^x - 1", "niveau": "Terminale"}).encode(),
    headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req).read().decode()
print(res)
