"""
End-to-End Investigation Flow Test:
  1. POST /api/v1/investigations (target validation, signal discovery, correlation)
  2. Investigation deduplication (cached result returned within window)
  3. GET /api/v1/investigations/{id} (intelligence dossier verification)
  4. GET /api/v1/investigations/{id}/evidence/{evidence_id} (forensic provenance)
  5. POST /api/v1/opt-out (right-to-be-forgotten exclusion)
  6. Verify opted-out target returns 403 on subsequent investigation attempt
  7. DELETE /api/v1/investigations/{id} (immediate hard purge)
  8. Verify 404 on purged investigation
"""

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_full_investigation_lifecycle_e2e():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Initiate Investigation
        target = "investigative.subject@example.com"
        create_res = await client.post(
            "/api/v1/investigations",
            json={"target": target, "target_type": "EMAIL"},
        )
        assert create_res.status_code == 201
        inv_data = create_res.json()
        inv_id = inv_data["id"]
        assert len(inv_id) == 36
        assert inv_data["target_value"] == target
        assert inv_data["status"] in ("COMPLETED", "PARTIALLY_COMPLETED")
        assert len(inv_data["entities"]) >= 1

        # Verify root entity
        root_entity = inv_data["entities"][0]
        assert root_entity["canonical_value"] == target
        assert root_entity["entity_type"] == "EMAIL_TARGET"

        # Step 2: Target Deduplication within window
        dup_res = await client.post(
            "/api/v1/investigations",
            json={"target": target, "target_type": "EMAIL"},
        )
        assert dup_res.status_code == 201
        # Should return the same cached investigation record
        assert dup_res.json()["id"] == inv_id

        # Step 3: GET /investigations/{id}
        get_res = await client.get(f"/api/v1/investigations/{inv_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == inv_id

        # Step 4: Inspect evidence record if relationships exist
        relationships = inv_data.get("relationships", [])
        if relationships and relationships[0].get("evidence_id"):
            ev_id = relationships[0]["evidence_id"]
            ev_res = await client.get(f"/api/v1/investigations/{inv_id}/evidence/{ev_id}")
            assert ev_res.status_code == 200
            evidence = ev_res.json()
            assert evidence["id"] == ev_id
            assert "source_label" in evidence
            assert "observation_confidence" in evidence

        # Step 5: Register Opt-Out
        opt_out_res = await client.post(
            "/api/v1/opt-out",
            json={"email": "privacy.first@example.org"},
        )
        assert opt_out_res.status_code == 200
        assert opt_out_res.json()["status"] == "opted_out"

        # Step 6: Verify opted-out target is blocked
        blocked_res = await client.post(
            "/api/v1/investigations",
            json={"target": "privacy.first@example.org", "target_type": "EMAIL"},
        )
        assert blocked_res.status_code == 403
        assert blocked_res.json()["error"]["code"] == "TARGET_OPTED_OUT"

        # Step 7: DELETE /investigations/{id} Hard Purge
        del_res = await client.delete(f"/api/v1/investigations/{inv_id}")
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "deleted"

        # Step 8: Verify 404 on purged investigation
        purged_res = await client.get(f"/api/v1/investigations/{inv_id}")
        assert purged_res.status_code == 404
        assert purged_res.json()["error"]["code"] == "INVESTIGATION_NOT_FOUND"
