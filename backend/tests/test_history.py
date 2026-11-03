from fastapi.testclient import TestClient


def test_history_crud_lifecycle(client: TestClient):
    # 1. Initial list should be empty
    response = client.get("/api/history")
    assert response.status_code == 200
    assert response.json() == []

    # 2. Create history item
    payload = {
        "original_text": "Texto original dictado por voz",
        "improved_text": "Texto mejorado y formateado con precisión",
        "tone": "formal",
    }
    create_resp = client.post("/api/history", json=payload)
    assert create_resp.status_code == 201
    created_item = create_resp.json()
    assert created_item["id"] > 0
    assert created_item["original_text"] == payload["original_text"]
    assert created_item["improved_text"] == payload["improved_text"]
    assert created_item["tone"] == "formal"
    assert "created_at" in created_item
    assert "T" in created_item["created_at"]
    assert created_item["created_at"].endswith("Z")
    item_id = created_item["id"]

    # 3. Create second item to verify ordering (most recent first)
    payload_2 = {
        "original_text": "Segunda idea",
        "improved_text": "Segunda idea mejorada",
        "tone": "concise",
    }
    client.post("/api/history", json=payload_2)

    list_resp = client.get("/api/history")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 2
    assert items[0]["original_text"] == "Segunda idea"
    assert items[1]["original_text"] == "Texto original dictado por voz"
    assert "T" in items[0]["created_at"] and items[0]["created_at"].endswith("Z")

    # 4. Delete first item
    delete_resp = client.delete(f"/api/history/{item_id}")
    assert delete_resp.status_code == 200
    assert delete_resp.json() == {
        "message": "Elemento eliminado correctamente.",
        "id": item_id,
    }

    # 5. Verify item no longer in list
    list_after_delete = client.get("/api/history")
    remaining_items = list_after_delete.json()
    assert len(remaining_items) == 1
    assert remaining_items[0]["original_text"] == "Segunda idea"

    # 6. Delete non-existent item should return 404
    not_found_resp = client.delete(f"/api/history/{item_id}")
    assert not_found_resp.status_code == 404
    assert "No se encontró" in not_found_resp.json()["detail"]


def test_history_create_validation(client: TestClient):
    # Empty texts should fail validation
    res = client.post("/api/history", json={"original_text": "", "improved_text": "", "tone": "neutral"})
    assert res.status_code == 422

    # Whitespace-only texts should fail validation
    res = client.post("/api/history", json={"original_text": "   ", "improved_text": "ok", "tone": "neutral"})
    assert res.status_code == 422

    res = client.post("/api/history", json={"original_text": "ok", "improved_text": "   ", "tone": "neutral"})
    assert res.status_code == 422

    # Invalid tone should fail validation
    res = client.post("/api/history", json={"original_text": "test", "improved_text": "test", "tone": "invalid_tone"})
    assert res.status_code == 422
