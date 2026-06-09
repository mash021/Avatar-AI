def test_health_endpoint_returns_200(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_endpoint_response_structure(client):
    response = client.get("/api/v1/health")
    data = response.json()

    assert "status" in data
    assert "service" in data
    assert "environment" in data
    assert "database" in data
    assert data["service"] == "AI Avatar API"
    assert data["database"] in ("connected", "disconnected")


def test_health_endpoint_status_reflects_database(client):
    response = client.get("/api/v1/health")
    data = response.json()

    if data["database"] == "connected":
        assert data["status"] == "ok"
    else:
        assert data["status"] == "degraded"
