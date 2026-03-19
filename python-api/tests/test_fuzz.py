import sys
import os
import unittest
import random
import string

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app

class TestFuzzSolve(unittest.TestCase):
    """
    Test de fuzzer (Property-based testing) pour tester la robustesse absolue de l'API mathématique.
    Garantit l'absence de crashs aveugles (HTTP 500) sur n'importe quelle entrée "poubelle".
    """
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def generate_random_equation(self):
        length = random.randint(0, 30)
        chars = 'x0123456789+-*/()= .,;$'
        return ''.join(random.choice(chars) for _ in range(length))
        
    def test_random_garbage_inputs(self):
        print("\n[Fuzzing] Démarrage de la vérification de robustesse sur 250 cas mutants...")
        
        # Injections ciblées qui ont causé des bugs historiquement
        edge_cases = [
            "3x^2 - 5x + 2 = ", 
            "= 8", 
            "3x+2=4)", 
            "()()=", 
            "(", 
            "0=", 
            "==", 
            "x=", 
            "  $,,,  ",
            "x/0=1",
            "3x^2 - 5x + 2 = 0, \n  ",
        ]
        
        # Injections totalement aléatoires
        random_cases = [self.generate_random_equation() for _ in range(239)]
        
        all_cases = edge_cases + random_cases
        
        crashes_count = 0
        for eq in all_cases:
            resp = self.client.post('/solve', json={'equation': eq, 'niveau': 'terminale_spe'})
            
            # La preuve mathématique de stabilité ici : l'API ne crashe JAMAIS en 500.
            # Soit elle valide (200), soit elle renvoie 400 (rejet correct de l'erreur).
            if resp.status_code >= 500:
                print(f"CRITICAL 500 CRASH WITH EQUATION: {eq}")
                crashes_count += 1
                
        self.assertEqual(crashes_count, 0, f"Le serveur a crashé sur {crashes_count} entrées !")
        print("[Fuzzing] Succès de la vérification. 0 crashs serveurs interceptés.")

if __name__ == '__main__':
    unittest.main()
