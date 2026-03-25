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

    def test_derivative_endpoint_basic(self):
        """
        Regression test for the /derivative endpoint
        Ensures that it computes raw and factored derivatives correctly
        """
        resp = self.client.post('/derivative', json={'expression': 'x^3 - 3x^2 + 2x'})
        data = resp.get_json()
        self.assertTrue(data['success'], f"Derivative calculation failed. Error: {data.get('error')}")
        self.assertIn('raw_derivative_str', data)
        self.assertIn('factored_derivative_str', data)
        # 3x^2 - 6x + 2 is the derivative
        self.assertTrue('3*x**2 - 6*x + 2' in data['raw_derivative_str'] or '3*x**2' in data['raw_derivative_str'])

    def test_transcendental_derivative(self):
        """
        Regression test for transcendental functions derivation
        """
        resp = self.client.post('/derivative', json={'expression': 'e^x / x'})
        data = resp.get_json()
        self.assertTrue(data['success'])
        self.assertTrue('exp(x)' in data['raw_derivative_str'])

    def test_sign_table_exact_roots(self):
        """
        Regression test to ensure exactMap returns LaTeX representation of non-integer/non-numeric irrational roots
        when originalExpr is supplied.
        """
        # Testing derivative of x^3 - 3x^2 + 2x which is 3x^2 - 6x + 2
        # Its roots are 1 - sqrt(3)/3 and 1 + sqrt(3)/3. Extremums for f(x) are +/- 2sqrt(3)/9
        resp = self.client.post('/sign-table', json={
            'expression': '3*x^2 - 6*x + 2',
            'niveau': 'terminale_spe',
            'originalExpr': 'x^3 - 3*x^2 + 2*x'
        })
        data = resp.get_json()
        self.assertTrue(data['success'])
        self.assertIn('exactMap', data)
        exacts = data['exactMap']

        # E.g. 0.4226 -> 1 - \frac{\sqrt{3}}{3}
        root_latex_found = False
        img_latex_found = False
        for k, v in exacts.items():
            if 'sqrt' in v and 'frac' in v:
                if 'y_' in k:
                    img_latex_found = True
                else:
                    root_latex_found = True
        
        self.assertTrue(root_latex_found, "Exact LaTeX roots missing from exactMap")
        self.assertTrue(img_latex_found, "Exact LaTeX images (extrema) missing from exactMap")

if __name__ == '__main__':
    unittest.main()
