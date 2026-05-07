import os
import pytest
from sqlalchemy import text
from app import create_app, db
from app.models import Usuario, ContaFixa
import threading
from flask import current_app

# Total de testes: 32 -- 05/05/2026
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


def get_auth_header(client, nome="Iago", senha="123456"):
    return create_user_and_login(client, nome, f"{nome}@test.com", senha)


def create_conta_fixa(client, headers, user_id, nome="Aluguel", valor=1500.0, dia_vencimento=10):
    return client.post("/contas-fixas/create", headers=headers, json={
        "user_id": user_id,
        "nome": nome,
        "valor": valor,
        "dia_vencimento": dia_vencimento
    })


######################################## CONTAS FIXAS /create ########################################

def test_create_conta_fixa_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = create_conta_fixa(client, headers, user_id)
    assert response.status_code == 201
    data = response.get_json()
    assert data["message"] == "Conta fixa criada com sucesso"
    assert data["conta_fixa"]["nome"] == "Aluguel"
    assert data["conta_fixa"]["valor"] == 1500.0


def test_create_conta_fixa_no_token(client):
    response = client.post("/contas-fixas/create", json={
        "user_id": 1, "nome": "Teste", "valor": 100, "dia_vencimento": 5
    })
    assert response.status_code == 401


def test_create_conta_fixa_invalid_token(client):
    headers = {"Authorization": "Bearer token_invalido"}
    response = client.post("/contas-fixas/create", headers=headers, json={
        "user_id": 1, "nome": "Teste", "valor": 100, "dia_vencimento": 5
    })
    assert response.status_code == 401


def test_create_conta_fixa_malformed_token(client):
    headers = {"Authorization": "Bearer abc.def.ghi"}
    response = client.post("/contas-fixas/create", headers=headers, json={
        "user_id": 1, "nome": "Teste", "valor": 100, "dia_vencimento": 5
    })
    assert response.status_code == 401


def test_create_conta_fixa_missing_fields(client):
    headers = get_auth_header(client)
    response = client.post("/contas-fixas/create", headers=headers, json={})
    assert response.status_code == 400


def test_create_conta_fixa_null_json(client):
    headers = get_auth_header(client)
    response = client.post("/contas-fixas/create", headers=headers)
    assert response.status_code == 400


def test_create_conta_fixa_sql_injection(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = create_conta_fixa(client, headers, user_id,
        nome="test' OR 1=1 --", valor=100, dia_vencimento=5)
    assert response.status_code == 201


def test_create_conta_fixa_xss(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = create_conta_fixa(client, headers, user_id,
        nome="<script>alert(1)</script>", valor=100, dia_vencimento=5)
    assert response.status_code == 201


def test_create_conta_fixa_negative_value(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = create_conta_fixa(client, headers, user_id, valor=-100)
    assert response.status_code in [201, 400]


def test_create_conta_fixa_invalid_dia(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = create_conta_fixa(client, headers, user_id, dia_vencimento=99)
    assert response.status_code in [201, 400]


def test_create_conta_fixa_string_value(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = client.post("/contas-fixas/create", headers=headers, json={
        "user_id": user_id, "nome": "Teste", "valor": "abc", "dia_vencimento": 5
    })
    assert response.status_code in [201, 400]


def test_create_conta_fixa_very_long_name(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = create_conta_fixa(client, headers, user_id, nome="A" * 10000)
    assert response.status_code in [201, 400, 413]


def test_create_conta_fixa_mass_assignment(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = client.post("/contas-fixas/create", headers=headers, json={
        "user_id": user_id,
        "nome": "Aluguel",
        "valor": 1500.0,
        "dia_vencimento": 10,
        "ativa": True
    })
    assert response.status_code == 201


def test_create_conta_fixa_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    info_b = client.get("/auth/info", headers=headers_b)
    user_b_id = info_b.get_json()["usuario"]["id"]

    response = client.post("/contas-fixas/create", headers=headers_a, json={
        "user_id": user_b_id,
        "nome": "HACKED",
        "valor": 100,
        "dia_vencimento": 5
    })
    assert response.status_code == 201


######################################## CONTAS FIXAS /minhascontas ########################################

def test_minhascontas_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    create_conta_fixa(client, headers, user_id)

    response = client.get(f"/contas-fixas/minhascontas?user_id={user_id}", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_minhascontas_no_token(client):
    response = client.get("/contas-fixas/minhascontas?user_id=1")
    assert response.status_code == 401


def test_minhascontas_invalid_token(client):
    headers = {"Authorization": "Bearer token_invalido"}
    response = client.get("/contas-fixas/minhascontas?user_id=1", headers=headers)
    assert response.status_code == 401


def test_minhascontas_missing_user_id(client):
    headers = get_auth_header(client)
    response = client.get("/contas-fixas/minhascontas", headers=headers)
    assert response.status_code in [200, 400]


def test_minhascontas_nonexistent_user(client):
    headers = get_auth_header(client)
    response = client.get("/contas-fixas/minhascontas?user_id=99999", headers=headers)
    assert response.status_code in [200, 404]


def test_minhascontas_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    info_b = client.get("/auth/info", headers=headers_b)
    user_b_id = info_b.get_json()["usuario"]["id"]

    response = client.get(f"/contas-fixas/minhascontas?user_id={user_b_id}", headers=headers_a)
    assert response.status_code == 200


def test_minhascontas_sql_injection(client):
    headers = get_auth_header(client)
    response = client.get("/contas-fixas/minhascontas?user_id=1 OR 1=1", headers=headers)
    assert response.status_code in [200, 400, 404]


######################################## CONTAS FIXAS /alterar ########################################

def test_alterar_conta_fixa_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers, user_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    response = client.put(f"/contas-fixas/alterar/{conta_id}", headers=headers, json={
        "nome": "Novo Aluguel", "valor": 2000.0, "dia_vencimento": 15
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["conta_fixa"]["nome"] == "Novo Aluguel"
    assert data["conta_fixa"]["valor"] == 2000.0


def test_alterar_conta_fixa_no_token(client):
    response = client.put("/contas-fixas/alterar/1", json={"nome": "Teste"})
    assert response.status_code == 401


def test_alterar_conta_fixa_not_found(client):
    headers = get_auth_header(client)
    response = client.put("/contas-fixas/alterar/99999", headers=headers, json={"nome": "Teste"})
    assert response.status_code == 404


def test_alterar_conta_fixa_empty_body(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers, user_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    response = client.put(f"/contas-fixas/alterar/{conta_id}", headers=headers)
    assert response.status_code == 400


def test_alterar_conta_fixa_negative_value(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers, user_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    response = client.put(f"/contas-fixas/alterar/{conta_id}", headers=headers, json={"valor": -500})
    assert response.status_code == 400


def test_alterar_conta_fixa_invalid_dia(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers, user_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    response = client.put(f"/contas-fixas/alterar/{conta_id}", headers=headers, json={"dia_vencimento": 99})
    assert response.status_code == 400


def test_alterar_conta_fixa_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    info_a = client.get("/auth/info", headers=headers_a)
    user_a_id = info_a.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers_a, user_a_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    response = client.put(f"/contas-fixas/alterar/{conta_id}", headers=headers_b, json={"nome": "HACKED"})
    assert response.status_code == 403


def test_alterar_conta_fixa_sql_injection(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers, user_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    response = client.put(f"/contas-fixas/alterar/{conta_id}", headers=headers, json={
        "nome": "test' OR 1=1 --"
    })
    assert response.status_code == 200


def test_alterar_conta_fixa_race_condition(client):
    headers = get_auth_header(client)
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers, user_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    app = current_app._get_current_object()

    def alterar(nome):
        with app.test_client() as thread_client:
            thread_client.put(
                f"/contas-fixas/alterar/{conta_id}",
                headers=headers,
                json={"nome": nome}
            )

    t1 = threading.Thread(target=alterar, args=("NomeA",))
    t2 = threading.Thread(target=alterar, args=("NomeB",))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    response = client.get(f"/contas-fixas/minhascontas?user_id={user_id}", headers=headers)
    assert response.status_code == 200


######################################## CONTAS FIXAS /deletar ########################################

def test_deletar_conta_fixa_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers, user_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    response = client.delete(f"/contas-fixas/deletar/{conta_id}", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["message"] == "Conta fixa deletada com sucesso"


def test_deletar_conta_fixa_no_token(client):
    response = client.delete("/contas-fixas/deletar/1")
    assert response.status_code == 401


def test_deletar_conta_fixa_not_found(client):
    headers = get_auth_header(client)
    response = client.delete("/contas-fixas/deletar/99999", headers=headers)
    assert response.status_code == 404


def test_deletar_conta_fixa_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    info_a = client.get("/auth/info", headers=headers_a)
    user_a_id = info_a.get_json()["usuario"]["id"]

    create_resp = create_conta_fixa(client, headers_a, user_a_id)
    conta_id = create_resp.get_json()["conta_fixa"]["id"]

    response = client.delete(f"/contas-fixas/deletar/{conta_id}", headers=headers_b)
    assert response.status_code == 403


def test_deletar_conta_fixa_malformed_id(client):
    headers = get_auth_header(client)
    response = client.delete("/contas-fixas/deletar/abc", headers=headers)
    assert response.status_code == 404