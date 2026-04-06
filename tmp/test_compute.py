import sys
import json
sys.path.append('python-api')
from app import compute_sign_table

res = compute_sign_table('e^x - 1', 'Terminale', originalExpr='e^x - 1')
with open('tmp/test_compute.json', 'w') as f:
    json.dump(res, f, indent=2)
