import asyncio
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from ai.nlp_dispatch import extract_dispatch_intent
import main


class TestNLPCoordinateParsing(unittest.TestCase):
    def test_colon_format(self):
        res = extract_dispatch_intent("lat: 13.0827, lng: 80.2707")
        self.assertAlmostEqual(res["lat"], 13.0827, places=4)
        self.assertAlmostEqual(res["lng"], 80.2707, places=4)

    def test_full_word_format(self):
        res = extract_dispatch_intent("latitude: 13.0827, longitude: 80.2707")
        self.assertAlmostEqual(res["lat"], 13.0827, places=4)
        self.assertAlmostEqual(res["lng"], 80.2707, places=4)

    def test_equals_format(self):
        res = extract_dispatch_intent("lat=13.0827, lon=80.2707")
        self.assertAlmostEqual(res["lat"], 13.0827, places=4)
        self.assertAlmostEqual(res["lng"], 80.2707, places=4)

    def test_mixed_separator_and_whitespace(self):
        res = extract_dispatch_intent("accident lat : 12.9716  lon = 77.5946 severe bleeding")
        self.assertAlmostEqual(res["lat"], 12.9716, places=4)
        self.assertAlmostEqual(res["lng"], 77.5946, places=4)

    def test_malformed_input_falls_back_to_keyword(self):
        res = extract_dispatch_intent("malformed lat: abc, lng: def near guindy")
        self.assertAlmostEqual(res["lat"], 13.0094, places=4)
        self.assertAlmostEqual(res["lng"], 80.2183, places=4)

    def test_out_of_range_falls_back(self):
        # Lat > 90, Lng > 180 should be rejected and fall back to keyword or default
        res = extract_dispatch_intent("lat: 120.0, lng: 200.0 near coimbatore")
        self.assertAlmostEqual(res["lat"], 11.0168, places=4)
        self.assertAlmostEqual(res["lng"], 76.9558, places=4)

    def test_negative_coordinates(self):
        res = extract_dispatch_intent("lat: -12.0464, lng: -77.0428")
        self.assertAlmostEqual(res["lat"], -12.0464, places=4)
        self.assertAlmostEqual(res["lng"], -77.0428, places=4)


if __name__ == "__main__":
    unittest.main()
