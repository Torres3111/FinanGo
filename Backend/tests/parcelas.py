import os
import pytest
from sqlalchemy import text
from app import create_app, db
from app.models import Usuario, Parcelamento
import threading
from flask import current_app
from datetime import datetime, date

# Total de testes: 45 -- 05/05/2026
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


def create_parcela(client, headers, descricao="TV", valor_total=3000.0, valor_parcela=250.0,
                    parcelas_totais=12, parcelas_restantes=12, data_inicio="2026-05-05"):
    return client.post("/parcelas/criar", headers=headers, json={
        "descricao": descricao,
        "valor_total": valor_total,
        "valor_parcela": valor_parcela,
        "parcelas_totais": parcelas_totais,
        "parcelas_restantes": parcelas_restantes,
        "data_inicio": data_inicio
    })


def post_parcela(client, headers, descricao="TV", valor_total=3000.0, valor_parcela=250.0,
                  parcelas_totais=12, parcelas_restantes=12, data_inicio="2026-05-05"):
    return client.post("/parcelas/criar", headers=headers, json={
        "descricao": descricao,
        "valor_total": valor_total,
        "valor_parcela": valor_parcela,
        "parcelas_totais": parcelas_totais,
        "parcelas_restantes": parcelas_restantes,
        "data_inicio": data_inicio
    })


######################################## PARCELAS /criar ########################################

def test_criar_parcela_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = post_parcela(client, headers)
    assert response.status_code == 201
    assert response.get_json()["message"] == "Parcelamento criado com sucesso"


def test_criar_parcela_no_token(client):
    response = client.post("/parcelas/criar", json={
        "descricao": "Teste", "valor_total": 1000, "valor_parcela": 100,
        "parcelas_totais": 10, "data_inicio": "2026-05-05"
    })
    assert response.status_code == 401


def test_criar_parcela_invalid_token(client):
    headers = {"Authorization": "Bearer token_invalido"}
    response = client.post("/parcelas/criar", headers=headers, json={
        "descricao": "Teste", "valor_total": 1000, "valor_parcela": 100,
        "parcelas_totais": 10, "data_inicio": "2026-05-05"
    })
    assert response.status_code == 401


def test_criar_parcela_missing_fields(client):
    headers = get_auth_header(client)
    response = client.post("/parcelas/criar", headers=headers, json={})
    assert response.status_code == 400


def test_criar_parcela_null_json(client):
    headers = get_auth_header(client)
    response = client.post("/parcelas/criar", headers=headers)
    assert response.status_code == 400


def test_criar_parcela_negative_values(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, valor_total=-100, valor_parcela=-10)
    assert response.status_code == 400


def test_criar_parcela_string_values(client):
    headers = get_auth_header(client)
    response = client.post("/parcelas/criar", headers=headers, json={
        "descricao": "Teste", "valor_total": "abc", "valor_parcela": "xyz",
        "parcelas_totais": 10, "data_inicio": "2026-05-05"
    })
    assert response.status_code == 400


def test_criar_parcela_huge_values(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, valor_total=9999999999999, valor_parcela=9999999999999)
    assert response.status_code == 400


def test_criar_parcela_zero_parcelas(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, parcelas_totais=0)
    assert response.status_code == 400


def test_criar_parcela_exceeds_max_parcelas(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, parcelas_totais=100)
    assert response.status_code == 400


def test_criar_parcela_string_parcelas(client):
    headers = get_auth_header(client)
    response = client.post("/parcelas/criar", headers=headers, json={
        "descricao": "Teste", "valor_total": 1000, "valor_parcela": 100,
        "parcelas_totais": "dez", "data_inicio": "2026-05-05"
    })
    assert response.status_code == 400


def test_criar_parcela_restantes_invalid(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, parcelas_restantes=20)
    assert response.status_code == 400


def test_criar_parcela_restantes_negative(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, parcelas_restantes=-1)
    assert response.status_code == 400


def test_criar_parcela_empty_description(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, descricao="")
    assert response.status_code == 400


def test_criar_parcela_very_long_description(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, descricao="A" * 10000)
    assert response.status_code in [400, 413]


def test_criar_parcela_invalid_date(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, data_inicio="invalida")
    assert response.status_code == 400


def test_criar_parcela_sql_injection(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, descricao="test' OR 1=1 --")
    assert response.status_code == 201


def test_criar_parcela_xss(client):
    headers = get_auth_header(client)
    response = post_parcela(client, headers, descricao="<script>alert(1)</script>")
    assert response.status_code == 201


def test_criar_parcela_duplicate(client):
    headers = get_auth_header(client, "Iago", "123456")
    post_parcela(client, headers, descricao="TV")
    response = post_parcela(client, headers, descricao="TV")
    assert response.status_code == 409


def test_criar_parcela_duplicate_different_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    post_parcela(client, headers_a, descricao="TV")
    response = post_parcela(client, headers_b, descricao="TV")
    assert response.status_code == 201


def test_criar_parcela_mass_assignment(client):
    headers = get_auth_header(client)
    response = client.post("/parcelas/criar", headers=headers, json={
        "descricao": "Teste", "valor_total": 1000, "valor_parcela": 100,
        "parcelas_totais": 10, "data_inicio": "2026-05-05", "is_admin": True
    })
    assert response.status_code == 201


def test_criar_parcela_idor_body_user_id(client):
    headers = get_auth_header(client, "UserA", "123")
    response = client.post("/parcelas/criar", headers=headers, json={
        "user_id": 9999, "descricao": "Teste", "valor_total": 1000,
        "valor_parcela": 100, "parcelas_totais": 10, "data_inicio": "2026-05-05"
    })
    assert response.status_code == 201


def test_criar_parcela_race_condition(client):
    headers = get_auth_header(client, "Iago", "123456")
    app = current_app._get_current_object()

    def criar():
        with app.test_client() as thread_client:
            thread_client.post("/parcelas/criar", headers=headers, json={
                "descricao": "Race", "valor_total": 1000, "valor_parcela": 100,
                "parcelas_totais": 10, "data_inicio": "2026-05-05"
            })

    threads = [threading.Thread(target=criar) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    response = client.get("/parcelas/mostrar", headers=headers)
    assert response.status_code == 200


######################################## PARCELAS /mostrar ########################################

def test_mostrar_parcelas_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_parcela(client, headers)
    create_parcela(client, headers, descricao="Geladeira", valor_total=2000)

    response = client.get("/parcelas/mostrar", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 2


def test_mostrar_parcelas_no_token(client):
    response = client.get("/parcelas/mostrar")
    assert response.status_code == 401


def test_mostrar_parcelas_empty(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = client.get("/parcelas/mostrar", headers=headers)
    assert response.status_code == 200
    assert response.get_json() == []


def test_mostrar_parcelas_user_isolation(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    create_parcela(client, headers_a, descricao="Parcela A")
    create_parcela(client, headers_b, descricao="Parcela B")

    data_a = client.get("/parcelas/mostrar", headers=headers_a).get_json()
    data_b = client.get("/parcelas/mostrar", headers=headers_b).get_json()

    assert len(data_a) == 1
    assert len(data_b) == 1
    assert data_a[0]["descricao"] == "Parcela A"
    assert data_b[0]["descricao"] == "Parcela B"


######################################## PARCELAS /deletar ########################################

def test_deletar_parcela_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    parcela_id = create_parcela(client, headers).get_json()["parcela"]["id"]

    response = client.delete(f"/parcelas/deletar/{parcela_id}", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["message"] == "Parcela deletada com sucesso"


def test_deletar_parcela_no_token(client):
    response = client.delete("/parcelas/deletar/1")
    assert response.status_code == 401


def test_deletar_parcela_not_found(client):
    headers = get_auth_header(client)
    response = client.delete("/parcelas/deletar/99999", headers=headers)
    assert response.status_code == 404


def test_deletar_parcela_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    parcela_id = create_parcela(client, headers_a).get_json()["parcela"]["id"]

    response = client.delete(f"/parcelas/deletar/{parcela_id}", headers=headers_b)
    assert response.status_code == 403


######################################## PARCELAS /editar ########################################

def test_editar_parcela_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    parcela_id = create_parcela(client, headers)

    response = client.put(f"/parcelas/editar/{parcela_id}", headers=headers, json={
        "descricao": "TV 4K", "valor_total": 3500.0
    })
    assert response.status_code == 200
    data = response.get_json()
    assert data["parcela"]["descricao"] == "TV 4K"
    assert data["parcela"]["valor_total"] == 3500.0


def test_editar_parcela_no_token(client):
    response = client.put("/parcelas/editar/1", json={"descricao": "Teste"})
    assert response.status_code == 401


def test_editar_parcela_not_found(client):
    headers = get_auth_header(client)
    response = client.put("/parcelas/editar/99999", headers=headers, json={"descricao": "Teste"})
    assert response.status_code == 404


def test_editar_parcela_empty_body(client):
    headers = get_auth_header(client)
    parcela_id = create_parcela(client, headers)

    response = client.put(f"/parcelas/editar/{parcela_id}", headers=headers)
    assert response.status_code == 400


def test_editar_parcela_empty_description(client):
    headers = get_auth_header(client)
    parcela_id = create_parcela(client, headers)

    response = client.put(f"/parcelas/editar/{parcela_id}", headers=headers, json={"descricao": ""})
    assert response.status_code == 400


def test_editar_parcela_negative_value(client):
    headers = get_auth_header(client)
    parcela_id = create_parcela(client, headers)

    response = client.put(f"/parcelas/editar/{parcela_id}", headers=headers, json={"valor_total": -100})
    assert response.status_code == 400


def test_editar_parcela_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    parcela_id = create_parcela(client, headers_a)

    response = client.put(f"/parcelas/editar/{parcela_id}", headers=headers_b, json={"descricao": "HACKED"})
    assert response.status_code == 403


def test_editar_parcela_sql_injection(client):
    headers = get_auth_header(client)
    parcela_id = create_parcela(client, headers)

    response = client.put(f"/parcelas/editar/{parcela_id}", headers=headers, json={
        "descricao": "test' OR 1=1 --"
    })
    assert response.status_code == 200


def test_editar_parcela_invalid_date(client):
    headers = get_auth_header(client)
    parcela_id = create_parcela(client, headers)

    response = client.put(f"/parcelas/editar/{parcela_id}", headers=headers, json={"data_inicio": "invalida"})
    assert response.status_code == 400


def test_editar_parcela_mass_assignment(client):
    headers = get_auth_header(client)
    parcela_id = create_parcela(client, headers)

    response = client.put(f"/parcelas/editar/{parcela_id}", headers=headers, json={"descricao": "Teste", "is_admin": True})
    assert response.status_code == 200


def test_editar_parcela_race_condition(client):
    headers = get_auth_header(client)
    parcela_id = create_parcela(client, headers)

    app = current_app._get_current_object()

    def editar(descricao):
        with app.test_client() as thread_client:
            thread_client.put(f"/parcelas/editar/{parcela_id}", headers=headers, json={"descricao": descricao})

    t1 = threading.Thread(target=editar, args=("DescA",))
    t2 = threading.Thread(target=editar, args=("DescB",))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    response = client.get("/parcelas/mostrar", headers=headers)
    assert response.status_code == 200


######################################## PARCELAS /pagar ########################################

def test_pagar_parcela_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    parcela_id = create_parcela(client, headers, parcelas_restantes=5).get_json()["parcela"]["id"]

    response = client.post(f"/parcelas/pagar/{parcela_id}", headers=headers)
    assert response.status_code == 200
    assert response.get_json()["message"] == "Parcela paga com sucesso"


def test_pagar_parcela_no_token(client):
    response = client.post("/parcelas/pagar/1")
    assert response.status_code == 401


def test_pagar_parcela_not_found(client):
    headers = get_auth_header(client)
    response = client.post("/parcelas/pagar/99999", headers=headers)
    assert response.status_code == 404


def test_pagar_parcela_idor_other_user(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    parcela_id = create_parcela(client, headers_a, parcelas_restantes=5).get_json()["parcela"]["id"]

    response = client.post(f"/parcelas/pagar/{parcela_id}", headers=headers_b)
    assert response.status_code == 404


def test_pagar_parcela_all_paid(client):
    headers = get_auth_header(client, "Iago", "123456")
    parcela_id = create_parcela(client, headers, parcelas_restantes=0).get_json()["parcela"]["id"]

    response = client.post(f"/parcelas/pagar/{parcela_id}", headers=headers)
    assert response.status_code == 400


def test_pagar_parcela_updates_status(client):
    headers = get_auth_header(client, "Iago", "123456")
    parcela_id = create_parcela(client, headers, parcelas_restantes=1).get_json()["parcela"]["id"]

    client.post(f"/parcelas/pagar/{parcela_id}", headers=headers)
    response = client.get("/parcelas/mostrar", headers=headers)
    assert response.get_json() == []


######################################## PARCELAS /resumo ########################################

def test_resumo_parcelas_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    create_parcela(client, headers, descricao="TV", valor_parcela=250)
    create_parcela(client, headers, descricao="Carro", valor_parcela=1000)

    response = client.get("/parcelas/resumo", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["quantidade_ativos"] == 2
    assert data["soma_total_mensal"] == 1250.0


def test_resumo_parcelas_no_token(client):
    response = client.get("/parcelas/resumo")
    assert response.status_code == 401


def test_resumo_parcelas_empty(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = client.get("/parcelas/resumo", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data["quantidade_ativos"] == 0
    assert data["soma_total_mensal"] == 0.0


def test_resumo_parcelas_user_isolation(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    create_parcela(client, headers_a, descricao="A", valor_parcela=500)
    create_parcela(client, headers_b, descricao="B", valor_parcela=999)

    resumo_a = client.get("/parcelas/resumo", headers=headers_a).get_json()
    resumo_b = client.get("/parcelas/resumo", headers=headers_b).get_json()

    assert resumo_a["soma_total_mensal"] == 500.0
    assert resumo_b["soma_total_mensal"] == 999.0


######################################## PARCELAS /historico ########################################

def test_historico_parcelas_success(client):
    headers = get_auth_header(client, "Iago", "123456")
    parcela_id = create_parcela(client, headers)

    client.delete(f"/parcelas/deletar/{parcela_id}", headers=headers)

    response = client.get("/parcelas/historico", headers=headers)
    assert response.status_code == 200
    data = response.get_json()
    assert len(data) == 1
    assert data[0]["ativo"] == False


def test_historico_parcelas_no_token(client):
    response = client.get("/parcelas/historico")
    assert response.status_code == 401


def test_historico_parcelas_empty(client):
    headers = get_auth_header(client, "Iago", "123456")
    response = client.get("/parcelas/historico", headers=headers)
    assert response.status_code == 200
    assert response.get_json() == []


def test_historico_parcelas_user_isolation(client):
    headers_a = get_auth_header(client, "UserA", "123")
    headers_b = get_auth_header(client, "UserB", "456")

    parcela_id_hist = create_parcela(client, headers_a)
    client.delete(f"/parcelas/deletar/{parcela_id_hist}", headers=headers_a)
    create_parcela(client, headers_b)

    hist_a = client.get("/parcelas/historico", headers=headers_a).get_json()
    hist_b = client.get("/parcelas/historico", headers=headers_b).get_json()

    assert len(hist_a) == 1
    assert len(hist_b) == 0

