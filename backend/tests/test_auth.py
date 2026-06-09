def test_login_success(client, admin_credentials, admin_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": admin_credentials["email"],
            "password": admin_credentials["password"],
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client, admin_credentials, admin_user):
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": admin_credentials["email"],
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


def test_me_endpoint(client, auth_headers, admin_credentials):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == admin_credentials["email"]
    assert data["role"] == "admin"


def test_me_requires_auth(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 403


def test_refresh_token(client, admin_credentials, admin_user):
    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": admin_credentials["email"],
            "password": admin_credentials["password"],
        },
    )
    refresh_token = login.json()["refresh_token"]

    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
