import requests
import json
res = requests.post("http://localhost:5000/sign-table", json={"expression": "(2x - 4)(-x + 3)(x^2 + 1)"})
print(json.dumps(res.json(), indent=2))
