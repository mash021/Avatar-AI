def test_list_urls_empty(client, auth_headers):
    response = client.get("/api/v1/admin/urls", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == []


def test_create_and_list_url(client, auth_headers):
    payload = {
        "url": "https://example.com",
        "label": "Example Site",
        "scrape_depth": 2,
    }
    create = client.post("/api/v1/admin/urls", json=payload, headers=auth_headers)
    assert create.status_code == 201
    data = create.json()
    assert data["url"] == "https://example.com/"
    assert data["label"] == "Example Site"
    assert data["status"] == "active"

    listing = client.get("/api/v1/admin/urls", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) >= 1


def test_update_url(client, auth_headers):
    create = client.post(
        "/api/v1/admin/urls",
        json={"url": "https://update-test.com", "label": "Old Label"},
        headers=auth_headers,
    )
    url_id = create.json()["id"]

    update = client.put(
        f"/api/v1/admin/urls/{url_id}",
        json={"label": "New Label", "status": "inactive"},
        headers=auth_headers,
    )
    assert update.status_code == 200
    assert update.json()["label"] == "New Label"
    assert update.json()["status"] == "inactive"


def test_delete_url(client, auth_headers):
    create = client.post(
        "/api/v1/admin/urls",
        json={"url": "https://delete-test.com", "label": "To Delete"},
        headers=auth_headers,
    )
    url_id = create.json()["id"]

    delete = client.delete(f"/api/v1/admin/urls/{url_id}", headers=auth_headers)
    assert delete.status_code == 204


def test_urls_require_auth(client):
    response = client.get("/api/v1/admin/urls")
    assert response.status_code == 403
