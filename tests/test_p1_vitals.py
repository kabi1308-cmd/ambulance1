import asyncio
import sys
import unittest
from pathlib import Path

# Add backend directory to sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import main


class TestClinicalVitalsAllocation(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await main.reset_hospitals()

    async def asyncTearDown(self):
        await main.reset_hospitals()

    async def test_critical_vitals_bump_severity_to_5(self):
        # Normal initial severity 3, but critical vitals (SpO2 86, Systolic 80)
        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="shortness of breath",
            severity=3,
            vitals={"spo2": 86, "systolic": 80, "pulse": 135}
        )
        res = await main.allocate(req)
        # Triage engine must evaluate vitals and bump severity to 5 (Critical)
        self.assertEqual(res["triage"]["severity"], 5)
        self.assertEqual(res["triage"]["triage_label"], "Critical")

    async def test_cardiac_symptoms_and_vitals_allocate_cath_lab(self):
        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="acute chest pain and diaphoresis, suspected STEMI",
            severity=4,
            vitals={"pulse": 110, "spo2": 95}
        )
        res = await main.allocate(req)
        self.assertEqual(res["triage"]["specialty_required"], "Cath Lab")
        self.assertTrue(res["specialty_match"])
        # Selected hospital must have had its Cath Lab beds decremented
        self.assertEqual(res["allocated_hospital"]["specialties"]["Cath Lab"], 1)

    async def test_burn_symptoms_allocate_burn_unit(self):
        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="severe chemical burn injury",
            severity=4
        )
        res = await main.allocate(req)
        self.assertEqual(res["triage"]["specialty_required"], "Burn Unit")
        self.assertTrue(res["specialty_match"])
        self.assertEqual(res["allocated_hospital"]["specialties"]["Burn Unit"], 0)


if __name__ == "__main__":
    unittest.main()
