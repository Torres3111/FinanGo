import os
import pytest
from sqlalchemy import text
from app import create_app, db
from app.models import Usuario
import threading

# Total de testes: 15 -- 28/04/2026
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


# Teste de conexão com o banco de dados
def test_db_connection(client):
    with client.application.app_context():
        try:
            db.session.execute(text("SELECT 1"))
        except Exception as e:
            pytest.fail(f"Falha na conexão com o banco de dados: {e}")


# Teste de login de usuário
def test_login_success(client):
    # cria usuário antes
    client.post("/auth/register", json={
        "nome": "Iago",
        "email": "iago@test.com",
        "senha_hash": "123456"
    })

    response = client.post("/auth/login", json={
        "nome": "Iago",
        "senha_hash": "123456"
    })

    assert response.status_code == 200

    data = response.get_json()
    print(data)
    assert data["message"] == "Login realizado com sucesso"
    assert "token" in data["usuario"]

# Teste de login com senha errada
def test_login_wrong_password(client):
    client.post("/auth/register", json={
        "nome": "Iago",
        "email": "iago@test.com",
        "senha_hash": "123456"
    })

    response = client.post("/auth/login", json={
        "nome": "Iago",
        "senha_hash": "senha_errada"
    })

    assert response.status_code == 401
    assert "Credenciais inválidas" in response.get_json()["error"]

# Teste de login com usuário não existente
def test_login_user_not_found(client):
    response = client.post("/auth/login", json={
        "nome": "nao_existe",
        "senha_hash": "123"
    })

    assert response.status_code == 401

# Teste de login com campos faltando
def test_login_missing_fields(client):
    response = client.post("/auth/login", json={})
    assert response.status_code == 400

# Teste de login com formato de dados inválido
def test_login_invalid_format(client):
    response = client.post("/auth/login", json={
        "nome": 123,
        "senha_hash": ["array"]
    })

    assert response.status_code == 400
    data = response.get_json()
    assert "Formato de dados inválido" in data["error"]

# Teste de login com payload nulo
def test_login_empty_body(client):
    response = client.post("/auth/login")
    assert response.status_code == 400

# Teste de login com valores nulos
def test_login_null_values(client):
    response = client.post("/auth/login", json={
        "nome": None,
        "senha_hash": None
    })

    assert response.status_code == 400

# Teste de login com nome muito longo
def test_login_long_input(client):
    response = client.post("/auth/login", json={
        "nome": "A" * 10000,
        "senha_hash": "B" * 10000
    })

    # pode ser 400 ou 401 dependendo do schema
    assert response.status_code in [400, 401]

# Teste de login com SQL Injection
def test_login_sql_injection(client):
    response = client.post("/auth/login", json={
        "nome": "admin' OR '1'='1",
        "senha_hash": "123"
    })

    # não pode autenticar
    assert response.status_code == 401

# Teste de login sem enumeração de usuários
def test_login_no_user_enumeration(client):
    response1 = client.post("/auth/login", json={
        "nome": "user_inexistente",
        "senha_hash": "123"
    })

    client.post("/auth/register", json={
        "nome": "Iago",
        "email": "iago@test.com",
        "senha_hash": "123456"
    })

    response2 = client.post("/auth/login", json={
        "nome": "Iago",
        "senha_hash": "senha_errada"
    })

    # respostas devem ser iguais
    assert response1.status_code == response2.status_code
    assert response1.get_json()["error"] == response2.get_json()["error"]

# Teste de login com XSS
def test_login_xss(client):
    response = client.post("/auth/login", json={
        "nome": "<script>alert(1)</script>",
        "senha_hash": "123"
    })

    assert response.status_code in [400, 401]

# Teste de login com muitos requests (rate limiting)
def test_login_rate_limit(client):
    for i in range(6):
        response = client.post("/auth/login", json={
            "nome": "Iago",
            "senha_hash": "123"
        })

    assert response.status_code == 429

# Teste de padrão de ataque de força bruta (múltiplas tentativas falhas seguidas por bloqueio)
def test_brute_force_pattern(client):
    client.post("/auth/register", json={
        "nome": "Iago",
        "email": "iago@test.com",
        "senha_hash": "correct_password"
    })

    for i in range(5):
        response = client.post("/auth/login", json={
            "nome": "Iago",
            "senha_hash": f"wrong_{i}"
        })

        assert response.status_code == 401

    # próxima tentativa deve bloquear
    response = client.post("/auth/login", json={
        "nome": "Iago",
        "senha_hash": "wrong_final"
    })

    assert response.status_code == 429

# Teste de token JWT é gerado corretamente após login bem-sucedido
def test_token_is_generated(client):
    client.post("/auth/register", json={
        "nome": "Iago",
        "email": "iago@test.com",
        "senha_hash": "123456"
    })

    response = client.post("/auth/login", json={
        "nome": "Iago",
        "senha_hash": "123456"
    })

    token = response.get_json()["usuario"]["token"]

    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 10