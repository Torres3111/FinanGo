import os
import pytest
from sqlalchemy import text
from app import create_app, db
from app.models import Usuario, ContaFixa
import threading
from flask import current_app

# Total de testes: 20 -- 05/05/2026
@pytest.fixture
def client():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY", "test_secret_key_only_for_testing_2026")
    })

    with app.app_context():
        db.create_all()

    with app.test_client() as client:
        yield client

    with app.app_context():
        db.session.remove()
        db.drop_all()

# Teste de criação de usuário e login para obter token de autenticação
def create_user_and_login(client, nome, email, senha, salario=5000):
    client.post("/auth/register", json={
        "nome": nome,
        "email": email,
        "senha_hash": senha,
        "salario_mensal": salario
    })
    login = client.post("/auth/login", json={
        "nome": nome,
        "senha_hash": senha
    })
    token = login.get_json()["usuario"]["token"]
    return {"Authorization": f"Bearer {token}"}

# Função auxiliar para obter token de autenticação
def get_auth_header(client, nome="Iago", senha="123456"):
    return create_user_and_login(client, nome, f"{nome}@test.com", senha)


######################################## DASHBOARD /salariomensal ########################################
# Total de testes: 10 -- 05/05/2026
# Testes para validar o endpoint de salário mensal, incluindo casos de sucesso, autenticação e integridade dos dados retornados.
def test_salario_mensal_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = client.get("/dashboard/salariomensal", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert "salario_mensal" in data
    assert isinstance(data["salario_mensal"], float)


def test_salario_mensal_no_token(client):
    response = client.get("/dashboard/salariomensal")
    assert response.status_code == 401
    data = response.get_json()
    assert "error" in data


def test_salario_mensal_invalid_token(client):
    headers = {"Authorization": "Bearer token_invalido"}
    response = client.get("/dashboard/salariomensal", headers=headers)
    assert response.status_code == 401


def test_salario_mensal_malformed_token(client):
    headers = {"Authorization": "Bearer abc.def.ghi"}
    response = client.get("/dashboard/salariomensal", headers=headers)
    assert response.status_code == 401


def test_salario_mensal_token_tampering(client):
    headers = get_auth_header(client)
    token = headers["Authorization"].split()[1]
    fake_token = token + "abc"
    response = client.get("/dashboard/salariomensal", headers={
        "Authorization": f"Bearer {fake_token}"
    })
    assert response.status_code == 401


def test_salario_mensal_user_isolation(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    response_a = client.get("/dashboard/salariomensal", headers=headers_a)
    response_b = client.get("/dashboard/salariomensal", headers=headers_b)

    data_a = response_a.get_json()
    data_b = response_b.get_json()

    assert response_a.status_code == 200
    assert response_b.status_code == 200


def test_salario_mensal_data_type(client):
    headers = get_auth_header(client)
    response = client.get("/dashboard/salariomensal", headers=headers)
    data = response.get_json()
    assert isinstance(data["salario_mensal"], float)


def test_salario_mensal_null_salary(client):
    client.post("/auth/register", json={
        "nome": "NoSalary",
        "email": "nosalary@test.com",
        "senha_hash": "123"
    })
    login = client.post("/auth/login", json={
        "nome": "NoSalary",
        "senha_hash": "123"
    })
    token = login.get_json()["usuario"]["token"]
    response = client.get("/dashboard/salariomensal", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["salario_mensal"] == 0.0


def test_salario_mensal_multiple_requests(client):
    headers = get_auth_header(client)
    for _ in range(20):
        response = client.get("/dashboard/salariomensal", headers=headers)
        assert response.status_code == 200


def test_salario_mensal_race_condition(client):
    headers = get_auth_header(client)
    app = current_app._get_current_object()

    def get_salary():
        with app.test_client() as thread_client:
            thread_client.get("/dashboard/salariomensal", headers=headers)

    threads = [threading.Thread(target=get_salary) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    response = client.get("/dashboard/salariomensal", headers=headers)
    assert response.status_code == 200


######################################## DASHBOARD /somacontasfixas ########################################

def test_soma_contas_fixas_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = client.get("/dashboard/somacontasfixas", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert "soma_contas_fixas" in data
    assert isinstance(data["soma_contas_fixas"], float)


def test_soma_contas_fixas_no_token(client):
    response = client.get("/dashboard/somacontasfixas")
    assert response.status_code == 401
    data = response.get_json()
    assert "error" in data


def test_soma_contas_fixas_invalid_token(client):
    headers = {"Authorization": "Bearer token_invalido"}
    response = client.get("/dashboard/somacontasfixas", headers=headers)
    assert response.status_code == 401


def test_soma_contas_fixas_malformed_token(client):
    headers = {"Authorization": "Bearer xyz.uvw.rst"}
    response = client.get("/dashboard/somacontasfixas", headers=headers)
    assert response.status_code == 401


def test_soma_contas_fixas_token_tampering(client):
    headers = get_auth_header(client)
    token = headers["Authorization"].split()[1]
    fake_token = token + "xyz"
    response = client.get("/dashboard/somacontasfixas", headers={
        "Authorization": f"Bearer {fake_token}"
    })
    assert response.status_code == 401


def test_soma_contas_fixas_user_isolation(client):
    headers_a = create_user_and_login(client, "UserA", "a@test.com", "123", 5000)
    headers_b = create_user_and_login(client, "UserB", "b@test.com", "456", 8000)

    response_a = client.get("/dashboard/somacontasfixas", headers=headers_a)
    response_b = client.get("/dashboard/somacontasfixas", headers=headers_b)

    assert response_a.status_code == 200
    assert response_b.status_code == 200


def test_soma_contas_fixas_data_type(client):
    headers = get_auth_header(client)
    response = client.get("/dashboard/somacontasfixas", headers=headers)
    data = response.get_json()
    assert isinstance(data["soma_contas_fixas"], float)


def test_soma_contas_fixas_multiple_requests(client):
    headers = get_auth_header(client)
    for _ in range(20):
        response = client.get("/dashboard/somacontasfixas", headers=headers)
        assert response.status_code == 200


def test_soma_contas_fixas_race_condition(client):
    headers = get_auth_header(client)
    app = current_app._get_current_object()

    def get_soma():
        with app.test_client() as thread_client:
            thread_client.get("/dashboard/somacontasfixas", headers=headers)

    threads = [threading.Thread(target=get_soma) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    response = client.get("/dashboard/somacontasfixas", headers=headers)
    assert response.status_code == 200