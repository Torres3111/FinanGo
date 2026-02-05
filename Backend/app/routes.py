from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import ContaFixa, Usuario

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

    nome = data.get("nome")
    senha_hash = data.get("senha_hash")

    if not nome or not senha_hash:
        return jsonify({"error": "Dados obrigatórios ausentes. Yoooo"}), 400

    usuario = Usuario.query.filter_by(nome=nome).first()

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

############################## BUSCA SALÁRIO PARA DASHBOARD ##############################
dashboard_bp = Blueprint(
    "dashboard",
    __name__,
    url_prefix="/dashboard"
)

@dashboard_bp.route("/salariomensal", methods=["GET"])
def get_salario_mensal():
    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({"error": "ID do usuário é obrigatório"}), 400

    usuario = Usuario.query.get(user_id)

    if not usuario:
        return jsonify({"error": "Usuário não encontrado"}), 404

    return jsonify({
        "salario_mensal": float(usuario.salario_mensal or 0)
    }), 200

############################## BUSCA SALÁRIO PARA DASHBOARD ##############################

############################# CRIAR NOVA CONTA FIXA #################################
contas_fixas_bp = Blueprint(
    "contas_fixas",
    __name__,
    url_prefix="/contas-fixas"
)
@contas_fixas_bp.route("/create", methods=["POST"])
def create_conta_fixa():
    data = request.get_json()

    user_id = data.get("user_id")
    nome = data.get("nome")
    valor = data.get("valor")
    dia_vencimento = data.get("dia_vencimento")
    ativa = data.get("ativa", True)

    if not user_id or not nome or valor is None or not dia_vencimento:
        return jsonify({"error": "Dados obrigatórios ausentes"}), 400

    conta_fixa = ContaFixa(
        usuario_id=user_id,
        nome=nome,
        valor=valor,
        dia_vencimento=dia_vencimento,
        ativa=ativa
    )

    db.session.add(conta_fixa)
    db.session.commit()

    return jsonify({
        "message": "Conta fixa criada com sucesso",
        "conta_fixa": {
            "id": conta_fixa.id,
            "nome": conta_fixa.nome,
            "valor": float(conta_fixa.valor),
            "dia_vencimento": conta_fixa.dia_vencimento,
            "ativa": conta_fixa.ativa
        }
    }), 201
############################# CRIAR NOVA CONTA FIXA #################################

############################# LISTAR CONTAS FIXAS #################################
@contas_fixas_bp.route("/minhascontas", methods=["GET"])
def listar_contas_fixas():
    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({"error": "user_id é obrigatório"}), 400

    user = Usuario.query.get(user_id)
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    
    contas = (
        ContaFixa.query
        .filter_by(usuario_id=user_id)
        .order_by(ContaFixa.id.desc())
        .all()
    )

    return jsonify([
        {
            "id": conta.id,
            "nome": conta.nome,
            "valor": float(conta.valor),
            "dia_vencimento": conta.dia_vencimento,
            "ativa": conta.ativa,
        }
        for conta in contas
    ]), 200
############################# LISTAR CONTAS FIXAS #################################