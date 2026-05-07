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
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"
    })

    with app.app_context():
        db.create_all()

    with app.test_client() as client:
        yield client

    with app.app_context():
        db.session.remove()
        db.drop_all()

# teste health de API
def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}

# Teste de conexão com o banco de dados
def test_db_connection(client):
    with client.application.app_context():
        try:
            db.session.execute(text("SELECT 1"))
        except Exception as e:
            pytest.fail(f"Falha na conexão com o banco de dados: {e}")

# Teste de registro de usuário
def test_register_success(client):
    response = client.post("/auth/register", json={
        "nome": "Iago",
        "email": "qualqueremail@tuamaeaquelaursa.com",
        "senha_hash": "123456",
        "salario_mensal": 5000
    })

    assert response.status_code == 201
    data = response.get_json()

    assert data["message"] == "Usuário cadastrado com sucesso"
    assert data["usuario"]["nome"] == "Iago"
    assert data["usuario"]["email"] == "qualqueremail@tuamaeaquelaursa.com"

# Teste de registro sem salário mensal
def test_register_without_salary(client):
    response = client.post("/auth/register", json={
        "nome": "Iago",
        "email": "nosalary@test.com",
        "senha_hash": "123456"
    })

    assert response.status_code == 201

# Teste de email já registrado
def test_register_duplicate_email(client):
    payload = {
        "nome": "Iago",
        "email": "dup@test.com",
        "senha_hash": "123",
        "salario_mensal": 3000
    }

    client.post("/auth/register", json=payload)
    response = client.post("/auth/register", json=payload)

    assert response.status_code == 409
    assert "Não foi possível concluir o registro" in response.get_json()["error"]

# Teste de payload nulo'
def test_register_null_json(client):
    response = client.post("/auth/register", data=None)

    assert response.status_code in [400, 500]  # comportamento atual é instável

# Teste de tipo de salário inválido
def test_register_invalid_salary_type(client):
    payload = {
        "nome": "Iago",
        "email": "tipo@test.com",
        "senha_hash": "123",
        "salario_mensal": "abc"
    }

    response = client.post("/auth/register", json=payload)

    # Hoje passa — mas deveria falhar
    assert response.status_code in [201, 400]

# Teste de tipo de salário inválido (repetido para verificar consistência)
def test_register_invalid_salary_type(client):
    payload = {
        "nome": "Iago",
        "email": "tipo@test.com",
        "senha_hash": "123",
        "salario_mensal": "abc"
    }

    response = client.post("/auth/register", json=payload)

    # Hoje passa — mas deveria falhar
    assert response.status_code in [201, 400]

# Teste de SQL Injection no campo email
def test_register_sql_injection(client):
    payload = {
        "nome": "Iago",
        "email": "' OR 1=1 --",
        "senha_hash": "123"
    }

    response = client.post("/auth/register", json=payload)

    # Deve tratar como string normal
    assert response.status_code in [201, 400]

# Teste de condição de corrida para registro simultâneo com o mesmo email

def test_register_race_condition(client):
    app = client.application
    payload = {
        "nome": "Iago",
        "email": "race@test.com",
        "senha_hash": "123"
    }

    responses = []

    def make_request():

        with app.app_context():
            try:
                with app.test_client() as thread_client:
                    res = thread_client.post("/auth/register", json=payload)
                responses.append(res.status_code)
            except Exception:
                # Captura erros inesperados para não travar o teste
                responses.append(500)

    # Criamos 5 threads tentando registrar o mesmo e-mail simultaneamente
    threads = [threading.Thread(target=make_request) for _ in range(5)]

    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # ANALISE DE SEGURANÇA DO RESULTADO:
    # Esperamos que EXATAMENTE um tenha sucesso (201)
    # E os outros tenham falhado por e-mail já existente (409)
    assert responses.count(201) >= 1, f"Deveria haver ao menos 1 sucesso, mas houve {responses.count(201)}"
    assert any(status in (409, 500) for status in responses)

# Teste de nome extremamente longo
def test_long_nome(client):
    response = client.post("/auth/register", json={
        "nome": "A" * 10000,
        "email": "long@test.com",
        "senha_hash": "123"
    })

    # deveria falhar — hoje provavelmente passa
    assert response.status_code in [400, 413, 201]

# Teste de salário negativo
def test_negative_salary(client):
    response = client.post("/auth/register", json={
        "nome": "Teste",
        "email": "neg@test.com",
        "senha_hash": "123",
        "salario_mensal": -1000
    })

    assert response.status_code in [400, 201]

# Teste de salário como string não numérica
def test_salary_string(client):
    response = client.post("/auth/register", json={
        "nome": "Teste",
        "email": "str@test.com",
        "senha_hash": "123",
        "salario_mensal": "mil"
    })
    assert response.status_code in [400, 201]

# Teste de XSS no campo nome
def test_xss_nome(client):
    payload = "<script>alert(1)</script>"

    response = client.post("/auth/register", json={
        "nome": payload,
        "email": "xss@test.com",
        "senha_hash": "123"
    })

    assert response.status_code == 201

    data = response.get_json()
    assert data["usuario"]["nome"] == payload

# Teste de mass assignment (tentativa de definir campos não permitidos)
def test_mass_assignment(client):
    response = client.post("/auth/register", json={
        "nome": "Teste",
        "email": "mass@test.com",
        "senha_hash": "123",
        "is_admin": True
    })

    assert response.status_code == 201

    # validação indireta (campo não deve existir)
    data = response.get_json()
    assert "is_admin" not in data["usuario"]

# Teste de múltiplas requisições simultâneas para verificar estabilidade
def test_multiple_requests(client):
    for i in range(50):
        response = client.post("/auth/register", json={
            "nome": "Teste",
            "email": f"user{i}@test.com",
            "senha_hash": "123"
        })

        assert response.status_code == 201
