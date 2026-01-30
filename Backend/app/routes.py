from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import Usuario

auth_bp = Blueprint("auth", __name__)

############################## REGISTRO DE USUÁRIO ##############################
@auth_bp.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json()

    nome = data.get("nome")
    email = data.get("email")
    senha_hash = data.get("senha_hash")
    salario_mensal = data.get("salario_mensal")

    if not nome or not email or not senha_hash:
        return jsonify({"error": "Dados obrigatórios ausentes"}), 400

    if Usuario.query.filter_by(email=email).first():
        return jsonify({"error": "Email já cadastrado"}), 409

    usuario = Usuario(nome=nome, email=email, salario_mensal=salario_mensal)
    usuario.set_password(senha_hash)

    db.session.add(usuario)
    db.session.commit()

    return jsonify({
        "message": "Usuário cadastrado com sucesso",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email
        }
    }), 201
############################## REGISTRO DE USUÁRIO ##############################

############################# LOGIN DE USUÁRIO #################################
@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    senha_hash = data.get("senha_hash")

    if not email or not senha_hash:
        return jsonify({"error": "Dados obrigatórios ausentes"}), 400

    usuario = Usuario.query.filter_by(email=email).first()

    if not usuario or not usuario.check_password(senha_hash):
        return jsonify({"error": "Credenciais inválidas"}), 401

    return jsonify({
        "message": "Login realizado com sucesso",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email
        }
    }), 200
############################## LOGIN DE USUÁRIO ##############################