import asyncio
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from fastapi import HTTPException
from pydantic import ValidationError
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

    def test_mixed_format(self):
        res = extract_dispatch_intent("accident lat : 12.9716  lon = 77.5946 severe bleeding")
        self.assertAlmostEqual(res["lat"], 12.9716, places=4)
        self.assertAlmostEqual(res["lng"], 77.5946, places=4)

    def test_malformed_input_falls_back(self):
        # Malformed non-numeric values should be safely ignored and fall back to keyword
        res = extract_dispatch_intent("malformed lat: abc, lng: def near guindy")
        self.assertAlmostEqual(res["lat"], 13.0094, places=4)
        self.assertAlmostEqual(res["lng"], 80.2183, places=4)

    def test_out_of_range_coordinates_fall_back(self):
        # Coordinates outside [-90, 90] and [-180, 180] should fall back gracefully
        res = extract_dispatch_intent("lat: 120.0, lng: 200.0 near coimbatore")
        self.assertAlmostEqual(res["lat"], 11.0168, places=4)
        self.assertAlmostEqual(res["lng"], 76.9558, places=4)

    def test_negative_coordinates(self):
        res = extract_dispatch_intent("lat: -12.0464, lng: -77.0428")
        self.assertAlmostEqual(res["lat"], -12.0464, places=4)
        self.assertAlmostEqual(res["lng"], -77.0428, places=4)


class TestPydanticCoordinateValidation(unittest.TestCase):
    def test_out_of_bounds_latitude_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            main.PatientRequest(ambulance_lat=95.0, ambulance_lng=80.0)
        self.assertTrue(any("less than or equal to 90" in str(e) for e in ctx.exception.errors()))

    def test_out_of_bounds_longitude_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            main.PatientRequest(ambulance_lat=13.0, ambulance_lng=195.0)
        self.assertTrue(any("less than or equal to 180" in str(e) for e in ctx.exception.errors()))


class TestAllocationAndConcurrency(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await main.reset_hospitals()

    async def asyncTearDown(self):
        await main.reset_hospitals()

    async def test_standard_allocation_works(self):
        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="chest pain",
            severity=4
        )
        res = await main.allocate(req)
        self.assertIn("allocated_hospital", res)
        self.assertIn("distance_km", res)
        self.assertIn("estimated_time_mins", res)
        self.assertIn("allocation_score", res)
        self.assertIn("updated_hospitals", res)
        # Check that beds decremented from 5 to 4
        hosp1 = next(h for h in res["updated_hospitals"] if h["id"] == "hosp-1")
        self.assertEqual(hosp1["available_beds"], 4)

    async def test_concurrent_allocation_single_bed_prevents_oversubscription(self):
        """
        Simulate a scenario where only ONE bed remains in the entire network.
        Two concurrent requests arrive simultaneously.
        The atomic lock must ensure exactly one succeeds and one fails,
        with available_beds remaining at 0 and NEVER negative.
        """
        # Set all hospitals to 0 beds except hosp-1 which has exactly 1 bed
        for h in main.hospitals:
            h["available_beds"] = 0
        main.hospitals[0]["available_beds"] = 1

        req1 = main.PatientRequest(ambulance_lat=13.08, ambulance_lng=80.27, symptoms="patient A")
        req2 = main.PatientRequest(ambulance_lat=13.08, ambulance_lng=80.27, symptoms="patient B")

        # Execute both concurrently
        results = await asyncio.gather(
            main.allocate(req1),
            main.allocate(req2),
            return_exceptions=True
        )

        successes = [r for r in results if not isinstance(r, Exception)]
        failures = [r for r in results if isinstance(r, Exception)]

        # Exactly 1 request must succeed
        self.assertEqual(len(successes), 1, f"Expected 1 success, got {len(successes)}")
        # Exactly 1 request must fail
        self.assertEqual(len(failures), 1, f"Expected 1 failure, got {len(failures)}")
        
        # The failure must be a 400 HTTPException
        self.assertIsInstance(failures[0], HTTPException)
        self.assertEqual(failures[0].status_code, 400)
        self.assertIn("No available ICU beds", failures[0].detail)

        # The remaining beds must be exactly 0, never negative
        for h in main.hospitals:
            self.assertGreaterEqual(h["available_beds"], 0, f"Hospital {h['id']} has negative beds!")
        self.assertEqual(main.hospitals[0]["available_beds"], 0)

    async def test_failed_allocation_does_not_decrement_beds(self):
        # Set all beds to 0
        for h in main.hospitals:
            h["available_beds"] = 0

        req = main.PatientRequest(ambulance_lat=13.08, ambulance_lng=80.27)
        with self.assertRaises(HTTPException) as ctx:
            await main.allocate(req)
        self.assertEqual(ctx.exception.status_code, 400)

        # Confirm all beds remain 0
        for h in main.hospitals:
            self.assertEqual(h["available_beds"], 0)


if __name__ == "__main__":
    unittest.main()
