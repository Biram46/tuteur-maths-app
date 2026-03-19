import sys
import os
import unittest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app

class TestAppRegression(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_solve_empty_rhs_tuple_bug(self):
        """
        Regression test for the 'Add and tuple' bug when the right hand side
        evaluates to empty or contains trailing commas spaces.
        e.g. "3x^2 - 5x + 2 = "
        or "3x^2 - 5x + 2 = 0, "
        """
        for eq in ["3x^2 - 5x + 2 =", "3x^2 - 5x + 2 = 0, ", "3x^2 - 5x + 2 = 0 ; "]:
            resp = self.client.post('/solve', json={'equation': eq, 'niveau': 'terminale_spe'})
            data = resp.get_json()
            self.assertTrue(data['success'], f"Failed parsing: {eq}. Error: {data.get('error')}")
            self.assertIn('equation_latex', data)

if __name__ == '__main__':
    unittest.main()
