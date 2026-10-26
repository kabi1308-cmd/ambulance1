import unittest
from pathlib import Path
import sys

backend_path = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_path))

import main
import database


class TestPersistenceAndIncidents(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        await main.reset_hospitals()

    async def asyncTearDown(self):
        await main.reset_hospitals()

    async def test_allocation_persists_to_sqlite(self):
        # Initial state of hosp-1 is 5 available beds
        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="acute myocardial infarction, stemi",
            severity=5,
            vitals={"pulse": 110, "spo2": 93}
        )
        res = await main.allocate(req)
        self.assertIn("incident", res)
        self.assertIsNotNone(res["incident"])
        self.assertEqual(res["incident"]["allocated_hospital_id"], "hosp-1")

        # Reload directly from SQLite database file
        persisted = database.load_hospitals()
        hosp1 = next(h for h in persisted if h["id"] == "hosp-1")
        # Beds decremented in SQLite
        self.assertEqual(hosp1["available_beds"], 4)
        # Cath Lab specialty decremented in SQLite (2 -> 1)
        self.assertEqual(hosp1["specialties"]["Cath Lab"], 1)

    async def test_incident_log_retrieval_and_status_update(self):
        req = main.PatientRequest(
            ambulance_lat=13.0827,
            ambulance_lng=80.2707,
            symptoms="burn injury second degree",
            severity=4
        )
        res = await main.allocate(req)
        inc_id = res["incident"]["id"]

        # Fetch incidents list
        incidents = main.list_incidents(limit=10)
        self.assertTrue(any(inc["id"] == inc_id for inc in incidents))

        # Update status
        update_res = main.set_incident_status(inc_id, main.IncidentStatusUpdate(status="EN_ROUTE"))
        self.assertEqual(update_res["new_status"], "EN_ROUTE")

        # Verify updated in database
        updated_incidents = main.list_incidents(limit=10)
        matched = next(inc for inc in updated_incidents if inc["id"] == inc_id)
        self.assertEqual(matched["status"], "EN_ROUTE")

    async def test_specialty_bed_stepper(self):
        # hosp-1 has 2 Neuro ICU beds
        res = await main.update_specialty_beds("hosp-1", main.SpecialtyDelta(specialty="Neuro ICU", delta=1))
        hosp1 = next(h for h in res["updated_hospitals"] if h["id"] == "hosp-1")
        self.assertEqual(hosp1["specialties"]["Neuro ICU"], 3)

        # Decrement back
        res2 = await main.update_specialty_beds("hosp-1", main.SpecialtyDelta(specialty="Neuro ICU", delta=-1))
        hosp1_back = next(h for h in res2["updated_hospitals"] if h["id"] == "hosp-1")
        self.assertEqual(hosp1_back["specialties"]["Neuro ICU"], 2)


if __name__ == "__main__":
    unittest.main()
