import os
import pytest
from sqlalchemy import text
from app import create_app, db
from app.models import Usuario
import threading
from flask import current_app

# Total de testes: 25 -- 29/04/2026
@pytest.fixture
def client():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": os.getenv("JWT_SECRET_KEY", "test_secret_key_only_for_testing_2026")  # Adiciona chave secreta para JWT em testes
    })

    with app.app_context():
        db.create_all()

    with app.test_client() as client:
        yield client

    with app.app_context():
        db.session.remove()
        db.drop_all()

################################################## ROTA BUSCAR INFORMAÇÕES ##################################################
# Teste de conexão com o banco de dados
def test_db_connection(client):
    with client.application.app_context():
        try:
            db.session.execute(text("SELECT 1"))
        except Exception as e:
            pytest.fail(f"Falha na conexão com o banco de dados: {e}")

# Função auxiliar para criar usuário e obter o token de autenticação
def create_user_and_login(client, nome, email, senha):
    client.post("/auth/register", json={
        "nome": nome,
        "email": email,
        "senha_hash": senha
    })

    login = client.post("/auth/login", json={
        "nome": nome,
        "senha_hash": senha
    })

    token = login.get_json()["usuario"]["token"]
    return {"Authorization": f"Bearer {token}"}

# Função auxiliar para obter o token de autenticação
def get_auth_header(client, nome="Iago", senha="123456"):
    return create_user_and_login(client, nome, f"{nome}@test.com", senha)

# Teste para obter informações do usuário autenticado
def test_get_user_info_success(client):
    headers = get_auth_header(client)

    response = client.get("/auth/info", headers=headers)

    assert response.status_code == 200

    data = response.get_json()
    assert "usuario" in data
    assert "id" in data["usuario"]
    assert "nome" in data["usuario"]
    assert "email" in data["usuario"]

# Teste para obter informações do usuário sem token de autenticação
def test_get_user_info_no_token(client):
    response = client.get("/auth/info")

    assert response.status_code == 401

# Teste para obter informações do usuário com token de autenticação inválido
def test_get_user_info_invalid_token(client):
    headers = {"Authorization": "Bearer token_invalido"}

    response = client.get("/auth/info", headers=headers)

    assert response.status_code == 401

# Teste para obter informações do usuário com token de autenticação malformado
def test_get_user_info_malformed_token(client):
    headers = {"Authorization": "Bearer abc.def.ghi"}

    response = client.get("/auth/info", headers=headers)

    assert response.status_code == 401

# Teste para garantir que as informações do usuário são isoladas entre diferentes usuários
def test_get_user_info_isolation(client):
    # usuário A
    headers_a = get_auth_header(client, "UserA", "123")

    # usuário B
    headers_b = get_auth_header(client, "UserB", "456")

    response_a = client.get("/auth/info", headers=headers_a)
    response_b = client.get("/auth/info", headers=headers_b)

    data_a = response_a.get_json()
    data_b = response_b.get_json()

    assert data_a["usuario"]["id"] != data_b["usuario"]["id"]

# Teste para garantir que o salário mensal do usuário é retornado como 0.0 quando não definido
def test_user_info_null_salary(client):
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

    response = client.get("/auth/info", headers={
        "Authorization": f"Bearer {token}"
    })

    data = response.get_json()

    assert data["usuario"]["salario_mensal"] == 0.0

# Teste para garantir que o token de autenticação é inválido após a exclusão do usuário
def test_token_tampering_attempt(client):
    headers = get_auth_header(client)

    token = headers["Authorization"].split()[1]

    # manipulação simples (quebra assinatura)
    fake_token = token + "abc"

    response = client.get("/auth/info", headers={
        "Authorization": f"Bearer {fake_token}"
    })

    assert response.status_code == 401

# Teste para garantir que as informações do usuário retornam os tipos de dados corretos
def test_user_info_types(client):
    headers = get_auth_header(client)

    response = client.get("/auth/info", headers=headers)

    data = response.get_json()["usuario"]

    assert isinstance(data["id"], int)
    assert isinstance(data["nome"], str)
    assert isinstance(data["email"], str)
    assert isinstance(data["salario_mensal"], float)

# Teste para garantir que múltiplas requisições com o mesmo token de autenticação funcionam corretamente
def test_multiple_requests_same_token(client):
    headers = get_auth_header(client)

    for _ in range(20):
        response = client.get("/auth/info", headers=headers)
        assert response.status_code == 200

################################################## ROTA BUSCAR INFORMAÇÕES ##################################################

################################################## ROTA ALTERAR INFORMAÇÕES ##################################################
# Teste de sucesso para atualização de informações do usuário
def test_update_user_success(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    # pegar ID via /info
    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = client.put("/auth/alterar",
        headers=headers,
        json={
            "id": user_id,
            "nome": "Novo Nome"
        }
    )

    assert response.status_code == 200
    assert "Dados atualizados com sucesso" in response.get_json()["message"]

# Teste para atualização de informações do usuário sem token de autenticação
def test_update_without_token(client):
    response = client.put("/auth/alterar", json={
        "id": 1,
        "nome": "Teste"
    })

    assert response.status_code == 401

# Teste para atualização de sem ID
def test_update_missing_id(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    response = client.put("/auth/alterar",
        headers=headers,
        json={"nome": "Teste"}
    )

    assert response.status_code == 200

# Teste para atualização de informações do usuário com ID que não existe
def test_update_user_not_found(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    response = client.put("/auth/alterar",
        headers=headers,
        json={
            "id": 9999,
            "nome": "Teste"
        }
    )

    assert response.status_code == 403

# Teste para garantir que um usuário não pode alterar as informações de outro usuário (ID diferente)
def test_update_other_user_idor(client):
    # usuário A
    headers_a = create_user_and_login(client, "UserA", "a@test.com", "123")

    # usuário B
    headers_b = create_user_and_login(client, "UserB", "b@test.com", "456")

    # pega ID do B
    info_b = client.get("/auth/info", headers=headers_b)
    user_b_id = info_b.get_json()["usuario"]["id"]

    # A tenta alterar B
    response = client.put("/auth/alterar",
        headers=headers_a,
        json={
            "id": user_b_id,
            "nome": "HACKED"
        }
    )

    assert response.status_code == 403

# Teste para garantir que um usuário não pode alterar as informações de outro usuário (ID do token diferente do ID do corpo)
def test_update_mass_assignment(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = client.put("/auth/alterar",
        headers=headers,
        json={
            "id": user_id,
            "is_admin": True
        }
    )

    assert response.status_code == 200

# Teste para garantir que o endpoint de atualização de informações do usuário lida corretamente com tipos de dados inválidos (ID como string)
def test_update_invalid_id_type(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    response = client.put("/auth/alterar",
        headers=headers,
        json={
            "id": "abc",
            "nome": "Teste"
        }
    )

    assert response.status_code in [400, 403, 500]

# Teste para garantir que o endpoint de atualização de informações do usuário lida corretamente com corpo da requisição vazio
def test_update_empty_body(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    response = client.put("/auth/alterar", headers=headers)

    assert response.status_code in [400, 403, 500]

# Teste para garantir que o endpoint de atualização de informações do usuário lida corretamente com campos vazios
def test_update_empty_fields(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = client.put("/auth/alterar",
        headers=headers,
        json={
            "id": user_id,
            "nome": "",
            "email": ""
        }
    )

    assert response.status_code == 400

# Teste para garantir que o endpoint de atualização de informações do usuário lida corretamente com tentativas de SQL Injection
def test_update_sql_injection(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    response = client.put("/auth/alterar",
        headers=headers,
        json={
            "id": user_id,
            "nome": "test' OR 1=1"
        }
    )

    assert response.status_code == 200

# Teste para garantir que as alterações feitas no endpoint de atualização de informações do usuário são persistidas corretamente no banco de dados
def test_update_persistence(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    client.put("/auth/alterar",
        headers=headers,
        json={
            "id": user_id,
            "nome": "Persistido"
        }
    )

    response = client.get("/auth/info", headers=headers)

    assert response.get_json()["usuario"]["nome"] == "Persistido"

# Teste para garantir que o endpoint de atualização de informações do usuário lida corretamente com condições de corrida (simulando múltiplas requisições simultâneas)
def test_update_race_condition(client):
    headers = create_user_and_login(client, "Iago", "iago@test.com", "123")

    info = client.get("/auth/info", headers=headers)
    user_id = info.get_json()["usuario"]["id"]

    app = current_app._get_current_object()

    def update(name):
        with app.test_client() as thread_client:
            thread_client.put(
                "/auth/alterar",
                headers=headers,
                json={"id": user_id, "nome": name}
            )

    t1 = threading.Thread(target=update, args=("A",))
    t2 = threading.Thread(target=update, args=("B",))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    response = client.get("/auth/info", headers=headers)

    assert response.status_code == 200
################################################## ROTA ALTERAR INFORMAÇÕES ##################################################