import asyncio
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

from fastapi import HTTPException
import main


class TestSpecialtyBedInventory(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await main.reset_hospitals()

    async def asyncTearDown(self):
        await main.reset_hospitals()

    async def test_specialty_bed_decrements_on_successful_match(self):
        # Chennai City Care Hospital has 2 Cath Lab beds and 5 available beds
        hosp1 = next(h for h in main.hospitals if h["id"] == "hosp-1")
        initial_cath = hosp1["specialties"]["Cath Lab"]
        initial_total = hosp1["available_beds"]
        self.assertEqual(initial_cath, 2)
        self.assertEqual(initial_total, 5)

        # Allocate patient with acute chest pain (triggers Cath Lab specialty)
        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="acute chest pain and diaphoresis",
            severity=4
        )
        res = await main.allocate(req)
        self.assertEqual(res["allocated_hospital"]["id"], "hosp-1")
        self.assertTrue(res["specialty_match"])
        self.assertEqual(res["allocated_hospital"]["specialties"]["Cath Lab"], 1)
        self.assertEqual(res["allocated_hospital"]["available_beds"], 4)

        # Allocate second patient with same need
        res2 = await main.allocate(req)
        self.assertEqual(res2["allocated_hospital"]["id"], "hosp-1")
        self.assertTrue(res2["specialty_match"])
        self.assertEqual(res2["allocated_hospital"]["specialties"]["Cath Lab"], 0)
        self.assertEqual(res2["allocated_hospital"]["available_beds"], 3)

    async def test_unavailable_specialty_beds_never_become_negative(self):
        # Set Cath Lab beds to 0 in hosp-1
        hosp1 = next(h for h in main.hospitals if h["id"] == "hosp-1")
        hosp1["specialties"]["Cath Lab"] = 0
        hosp1["available_beds"] = 3

        # Zero out all other hospitals to force hosp-1 selection
        for h in main.hospitals:
            if h["id"] != "hosp-1":
                h["available_beds"] = 0

        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="acute chest pain",
            severity=4
        )
        res = await main.allocate(req)
        self.assertEqual(res["allocated_hospital"]["id"], "hosp-1")
        # Specialty match is False because 0 Cath Lab beds were available
        self.assertFalse(res["specialty_match"])
        # Cath Lab remains 0 (NEVER negative!)
        self.assertEqual(res["allocated_hospital"]["specialties"]["Cath Lab"], 0)
        # General bed was consumed
        self.assertEqual(res["allocated_hospital"]["available_beds"], 2)

    async def test_failed_allocation_does_not_alter_inventory(self):
        # Exhaust all beds across network
        for h in main.hospitals:
            h["available_beds"] = 0

        hosp1 = next(h for h in main.hospitals if h["id"] == "hosp-1")
        hosp1["specialties"]["Cath Lab"] = 2  # Specialty theoretically open, but no general beds

        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="acute chest pain",
            severity=4
        )
        with self.assertRaises(HTTPException) as ctx:
            await main.allocate(req)
        self.assertEqual(ctx.exception.status_code, 400)

        # Confirm Cath Lab still has 2 beds and was not altered
        self.assertEqual(hosp1["specialties"]["Cath Lab"], 2)
        self.assertEqual(hosp1["available_beds"], 0)

    async def test_concurrent_specialty_allocations(self):
        # hosp-1 has exactly 1 Cath Lab bed and 5 available beds
        hosp1 = next(h for h in main.hospitals if h["id"] == "hosp-1")
        hosp1["specialties"]["Cath Lab"] = 1
        # Set other hospitals far or 0 beds
        for h in main.hospitals:
            if h["id"] != "hosp-1":
                h["available_beds"] = 0

        req1 = main.PatientRequest(ambulance_lat=13.08, ambulance_lng=80.27, symptoms="acute chest pain patient 1")
        req2 = main.PatientRequest(ambulance_lat=13.08, ambulance_lng=80.27, symptoms="acute chest pain patient 2")

        res1, res2 = await asyncio.gather(main.allocate(req1), main.allocate(req2))

        # Both patients got admitted to hosp-1
        self.assertEqual(res1["allocated_hospital"]["id"], "hosp-1")
        self.assertEqual(res2["allocated_hospital"]["id"], "hosp-1")

        # Exactly one got a specialty match, the second got general admission
        matched_count = sum([res1["specialty_match"], res2["specialty_match"]])
        self.assertEqual(matched_count, 1)

        # Cath Lab bed count is 0, never negative
        final_hosp1 = next(h for h in main.hospitals if h["id"] == "hosp-1")
        self.assertEqual(final_hosp1["specialties"]["Cath Lab"], 0)
        self.assertEqual(final_hosp1["available_beds"], 3)


if __name__ == "__main__":
    unittest.main()
