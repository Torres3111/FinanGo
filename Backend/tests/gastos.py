import os
import pytest
from sqlalchemy import text
from app import create_app, db
from app.models import Usuario, RegistroDiario
import threading
from flask import current_app
from datetime import datetime, date

# Total de testes: 55 -- 05/05/2026
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


def create_gasto(client, headers, descricao="Almoço", valor=50.0, categoria="Alimentação", data_registro="2026-05-05"):
    return client.post("/registro/adicionar", headers=headers, json={
        "descricao": descricao,
        "valor": valor,
        "categoria": categoria,
        "data_registro": data_registro
    })


######################################## REGISTRO /adicionar ########################################

def test_adicionar_gasto_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = create_gasto(client, headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["message"] == "Gasto diário criado com sucesso"
    assert data["gasto_diario"]["descricao"] == "Almoço"
    assert data["gasto_diario"]["valor"] == 50.0
    assert data["gasto_diario"]["categoria"] == "Alimentação"


def test_adicionar_gasto_no_token(client):
    response = client.post("/registro/adicionar", json={
        "descricao": "Teste", "valor": 10, "categoria": "Outros", "data_registro": "2026-05-05"
    })
    assert response.status_code == 401


def test_adicionar_gasto_invalid_token(client):
    headers = {"Authorization": "Bearer token_invalido"}
    response = client.post("/registro/adicionar", headers=headers, json={
        "descricao": "Teste", "valor": 10, "categoria": "Outros", "data_registro": "2026-05-05"
    })
    assert response.status_code == 401


def test_adicionar_gasto_missing_fields(client):
    headers = get_auth_header(client)
    response = client.post("/registro/adicionar", headers=headers, json={})
    assert response.status_code == 400


def test_adicionar_gasto_null_json(client):
    headers = get_auth_header(client)
    response = client.post("/registro/adicionar", headers=headers)
    assert response.status_code == 400


def test_adicionar_gasto_invalid_json(client):
    headers = get_auth_header(client)
    response = client.post("/registro/adicionar", headers=headers, data="invalid json", content_type="application/json")
    assert response.status_code == 400


def test_adicionar_gasto_negative_value(client):
    headers = get_auth_header(client)
    response = create_gasto(client, headers, valor=-50)
    assert response.status_code == 400


def test_adicionar_gasto_string_value(client):
    headers = get_auth_header(client)
    response = client.post("/registro/adicionar", headers=headers, json={
        "descricao": "Teste", "valor": "abc", "categoria": "Outros", "data_registro": "2026-05-05"
    })
    assert response.status_code == 400


def test_adicionar_gasto_huge_value(client):
    headers = get_auth_header(client)
    response = create_gasto(client, headers, valor=9999999999999)
    assert response.status_code == 400


def test_adicionar_gasto_invalid_category(client):
    headers = get_auth_header(client)
    response = create_gasto(client, headers, categoria="CategoriaInvalida")
    assert response.status_code == 400


def test_adicionar_gasto_empty_description(client):
    headers = get_auth_header(client)
    response = create_gasto(client, headers, descricao="")
    assert response.status_code == 400


def test_adicionar_gasto_very_long_description(client):
    headers = get_auth_header(client)
    response = create_gasto(client, headers, descricao="A" * 10000)
    assert response.status_code in [400, 413]


def test_adicionar_gasto_invalid_date(client):
    headers = get_auth_header(client)
    response = create_gasto(client, headers, data_registro="data-invalida")
    assert response.status_code == 400


def test_adicionar_gasto_sql_injection(client):
    headers = get_auth_header(client)
    response = create_gasto(client, headers, descricao="test' OR 1=1 --")
    assert response.status_code == 201


def test_adicionar_gasto_xss(client):
    headers = get_auth_header(client)
    response = create_gasto(client, headers, descricao="<script>alert(1)</script>")
    assert response.status_code == 201


def test_adicionar_gasto_mass_assignment(client):
    headers = get_auth_header(client)
    response = client.post("/registro/adicionar", headers=headers, json={
        "descricao": "Teste", "valor": 10, "categoria": "Outros",
        "data_registro": "2026-05-05", "is_admin": True
    })
    assert response.status_code == 201
    data = response.get_json()
    assert "is_admin" not in data["gasto_diario"]


def test_adicionar_gasto_idor_body_user_id(client):
    headers = get_auth_header(client, "UserA", "123")
    response = client.post("/registro/adicionar", headers=headers, json={
        "user_id": 9999,
        "descricao": "Teste", "valor": 10, "categoria": "Outros", "data_registro": "2026-05-05"
    })
    assert response.status_code == 201


def test_adicionar_gasto_race_condition(client):
    headers = get_auth_header(client, "Iago", "123456")
    app = current_app._get_current_object()

    def adicionar():
        with app.test_client() as thread_client:
            thread_client.post("/registro/adicionar", headers=headers, json={
                "descricao": "Race", "valor": 10, "categoria": "Outros", "data_registro": "2026-05-05"
            })

    threads = [threading.Thread(target=adicionar) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    response = client.get("/registro/mostrar", headers=headers)
    assert response.status_code == 200


######################################## REGISTRO /mostrar ########################################

def test_mostrar_gastos_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_gasto(client, headers)
    create_gasto(client, headers, descricao="Jantar", valor=80, categoria="Lazer")

    response = client.get("/registro/mostrar", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["gastos"]) == 2


def test_mostrar_gastos_no_token(client):
    response = client.get("/registro/mostrar")
    assert response.status_code == 401


def test_mostrar_gastos_invalid_token(client):
    headers = {"Authorization": "Bearer token_invalido"}
    response = client.get("/registro/mostrar", headers=headers)
    assert response.status_code == 401


def test_mostrar_gastos_empty(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = client.get("/registro/mostrar", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["gastos"] == []


def test_mostrar_gastos_user_isolation(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    create_gasto(client, headers_a)
    create_gasto(client, headers_b, descricao="Gasto B")

    response_a = client.get("/registro/mostrar", headers=headers_a)
    response_b = client.get("/registro/mostrar", headers=headers_b)

    gastos_a = response_a.get_json()["gastos"]
    gastos_b = response_b.get_json()["gastos"]

    assert len(gastos_a) == 1
    assert len(gastos_b) == 1
    assert gastos_a[0]["descricao"] == "Almoço"
    assert gastos_b[0]["descricao"] == "Gasto B"


def test_mostrar_gastos_multiple_requests(client):
    headers = get_auth_header(client)
    for _ in range(20):
        response = client.get("/registro/mostrar", headers=headers)
        assert response.status_code == 200


######################################## REGISTRO /alterar ########################################

def test_alterar_gasto_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_resp = create_gasto(client, headers)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.put(f"/registro/alterar/{gasto_id}", headers=headers, json={
        "descricao": "Jantar", "valor": 100.0, "categoria": "Lazer"
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["gasto"]["descricao"] == "Jantar"
    assert data["gasto"]["valor"] == 100.0
    assert data["gasto"]["categoria"] == "Lazer"


def test_alterar_gasto_no_token(client):
    response = client.put("/registro/alterar/1", json={"descricao": "Teste"})
    assert response.status_code == 401


def test_alterar_gasto_not_found(client):
    headers = get_auth_header(client)
    response = client.put("/registro/alterar/99999", headers=headers, json={"descricao": "Teste"})
    assert response.status_code == 404


def test_alterar_gasto_empty_body(client):
    headers = get_auth_header(client)
    create_resp = create_gasto(client, headers)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.put(f"/registro/alterar/{gasto_id}", headers=headers)
    assert response.status_code == 400


def test_alterar_gasto_empty_description(client):
    headers = get_auth_header(client)
    create_resp = create_gasto(client, headers)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.put(f"/registro/alterar/{gasto_id}", headers=headers, json={"descricao": ""})
    assert response.status_code == 400


def test_alterar_gasto_negative_value(client):
    headers = get_auth_header(client)
    create_resp = create_gasto(client, headers)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.put(f"/registro/alterar/{gasto_id}", headers=headers, json={"valor": -50})
    assert response.status_code == 400


def test_alterar_gasto_invalid_category(client):
    headers = get_auth_header(client)
    create_resp = create_gasto(client, headers)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.put(f"/registro/alterar/{gasto_id}", headers=headers, json={"categoria": "Invalida"})
    assert response.status_code == 400


def test_alterar_gasto_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    create_resp = create_gasto(client, headers_a)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.put(f"/registro/alterar/{gasto_id}", headers=headers_b, json={"descricao": "HACKED"})
    assert response.status_code == 403


def test_alterar_gasto_sql_injection(client):
    headers = get_auth_header(client)
    create_resp = create_gasto(client, headers)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.put(f"/registro/alterar/{gasto_id}", headers=headers, json={"descricao": "test' OR 1=1 --"})
    assert response.status_code == 200


def test_alterar_gasto_race_condition(client):
    headers = get_auth_header(client)
    create_resp = create_gasto(client, headers)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    app = current_app._get_current_object()

    def alterar(nome):
        with app.test_client() as thread_client:
            thread_client.put(f"/registro/alterar/{gasto_id}", headers=headers, json={"descricao": nome})

    t1 = threading.Thread(target=alterar, args=("DescA",))
    t2 = threading.Thread(target=alterar, args=("DescB",))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    response = client.get("/registro/mostrar", headers=headers)
    assert response.status_code == 200


######################################## REGISTRO /deletar ########################################

def test_deletar_gasto_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_resp = create_gasto(client, headers)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.delete(f"/registro/deletar/{gasto_id}", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["message"] == "Gasto deletado com sucesso"


def test_deletar_gasto_no_token(client):
    response = client.delete("/registro/deletar/1")
    assert response.status_code == 401


def test_deletar_gasto_not_found(client):
    headers = get_auth_header(client)
    response = client.delete("/registro/deletar/99999", headers=headers)
    assert response.status_code == 404


def test_deletar_gasto_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    create_resp = create_gasto(client, headers_a)
    gasto_id = create_resp.get_json()["gasto_diario"]["id"]

    response = client.delete(f"/registro/deletar/{gasto_id}", headers=headers_b)
    assert response.status_code == 403


def test_deletar_gasto_malformed_id(client):
    headers = get_auth_header(client)
    response = client.delete("/registro/deletar/abc", headers=headers)
    assert response.status_code == 404


######################################## REGISTRO /total-gasto-mes ########################################

def test_total_gasto_mes_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_gasto(client, headers, valor=100, data_registro="2026-05-05")
    create_gasto(client, headers, valor=50, data_registro="2026-05-10")

    response = client.get("/registro/total-gasto-mes?mes=5&ano=2026", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 150.0
    assert data["gastos"] == 2


def test_total_gasto_mes_no_token(client):
    response = client.get("/registro/total-gasto-mes?mes=5&ano=2026")
    assert response.status_code == 401


def test_total_gasto_mes_missing_params(client):
    headers = get_auth_header(client)
    response = client.get("/registro/total-gasto-mes", headers=headers)
    assert response.status_code == 400


def test_total_gasto_mes_invalid_mes(client):
    headers = get_auth_header(client)
    response = client.get("/registro/total-gasto-mes?mes=13&ano=2026", headers=headers)
    assert response.status_code == 400


def test_total_gasto_mes_invalid_ano(client):
    headers = get_auth_header(client)
    response = client.get("/registro/total-gasto-mes?mes=5&ano=1800", headers=headers)
    assert response.status_code == 400


def test_total_gasto_mes_user_isolation(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    create_gasto(client, headers_a, valor=200, data_registro="2026-05-05")
    create_gasto(client, headers_b, valor=999, data_registro="2026-05-05")

    response_a = client.get("/registro/total-gasto-mes?mes=5&ano=2026", headers=headers_a)
    response_b = client.get("/registro/total-gasto-mes?mes=5&ano=2026", headers=headers_b)

    assert response_a.get_json()["total"] == 200.0
    assert response_b.get_json()["total"] == 999.0


######################################## REGISTRO /total-gasto-categoria ########################################

def test_total_gasto_categoria_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_gasto(client, headers, valor=100, categoria="Alimentação", data_registro="2026-05-05")
    create_gasto(client, headers, valor=50, categoria="Transporte", data_registro="2026-05-05")

    response = client.get("/registro/total-gasto-categoria?mes=5&ano=2026", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["total_por_categoria"]["Alimentação"] == 100.0
    assert data["total_por_categoria"]["Transporte"] == 50.0


def test_total_gasto_categoria_no_token(client):
    response = client.get("/registro/total-gasto-categoria?mes=5&ano=2026")
    assert response.status_code == 401


def test_total_gasto_categoria_missing_params(client):
    headers = get_auth_header(client)
    response = client.get("/registro/total-gasto-categoria", headers=headers)
    assert response.status_code == 400


def test_total_gasto_categoria_empty(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = client.get("/registro/total-gasto-categoria?mes=1&ano=2025", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert all(v == 0.0 for v in data["total_por_categoria"].values())


######################################## REGISTRO /percentual-gasto-categoria ########################################

def test_percentual_gasto_categoria_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_gasto(client, headers, valor=75, categoria="Alimentação", data_registro="2026-05-05")
    create_gasto(client, headers, valor=25, categoria="Transporte", data_registro="2026-05-05")

    response = client.get("/registro/percentual-gasto-categoria?mes=5&ano=2026", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["percentual_por_categoria"]["Alimentação"] == 75.0
    assert data["percentual_por_categoria"]["Transporte"] == 25.0


def test_percentual_gasto_categoria_no_token(client):
    response = client.get("/registro/percentual-gasto-categoria?mes=5&ano=2026")
    assert response.status_code == 401


def test_percentual_gasto_categoria_no_gastos(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = client.get("/registro/percentual-gasto-categoria?mes=1&ano=2025", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert all(v == 0.0 for v in data["percentual_por_categoria"].values())


######################################## REGISTRO /total-gasto-ano ########################################

def test_total_gasto_ano_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_gasto(client, headers, valor=100, data_registro="2026-01-15")
    create_gasto(client, headers, valor=200, data_registro="2026-06-20")

    response = client.get("/registro/total-gasto-ano?ano=2026", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["total"] == 300.0
    assert data["gastos"] == 2


def test_total_gasto_ano_no_token(client):
    response = client.get("/registro/total-gasto-ano?ano=2026")
    assert response.status_code == 401


def test_total_gasto_ano_missing_params(client):
    headers = get_auth_header(client)
    response = client.get("/registro/total-gasto-ano", headers=headers)
    assert response.status_code == 400


def test_total_gasto_ano_invalid_ano(client):
    headers = get_auth_header(client)
    response = client.get("/registro/total-gasto-ano?ano=1800", headers=headers)
    assert response.status_code == 400


######################################## REGISTRO /total-gasto-mes-ano ########################################

def test_total_gasto_mes_ano_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_gasto(client, headers, valor=100, data_registro="2026-05-05")

    response = client.get("/registro/total-gasto-mes-ano?ano=2026", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert "total_por_mes" in data
    assert len(data["total_por_mes"]) == 12


def test_total_gasto_mes_ano_no_token(client):
    response = client.get("/registro/total-gasto-mes-ano?ano=2026")
    assert response.status_code == 401


def test_total_gasto_mes_ano_missing_params(client):
    headers = get_auth_header(client)
    response = client.get("/registro/total-gasto-mes-ano", headers=headers)
    assert response.status_code == 400


def test_total_gasto_mes_ano_invalid_ano(client):
    headers = get_auth_header(client)
    response = client.get("/registro/total-gasto-mes-ano?ano=1800", headers=headers)
    assert response.status_code == 400