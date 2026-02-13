from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import ContaFixa, RegistroDiario, Usuario
from datetime import datetime

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

############################## BUSCA INFORMAÇÕES DE USUÁRIO ##############################
@auth_bp.route("/auth/info", methods=["GET"])
def get_user_info():
    user_id = request.args.get("user_id", type=int)

    if user_id is None:
        return jsonify({"error": "ID do usuário é obrigatório"}), 400

    usuario = db.session.get(Usuario, user_id)

    if usuario is None:
        return jsonify({"error": "Usuário não encontrado"}), 404

    return jsonify({
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "salario_mensal": float(usuario.salario_mensal or 0)
        }
    }), 200
############################## BUSCA INFORMAÇÕES DE USUÁRIO ##############################

############################## ALTERA INFORMAÇÕES DE USUÁRIO ##############################
@auth_bp.route("/auth/alterar", methods=["PUT"])
def update_user():
    data = request.get_json()
    user_id = data.get("id")

    if not user_id:
        return jsonify({"error": "ID do usuário é obrigatório"}), 400

    usuario = Usuario.query.get(user_id)

    if not usuario:
        return jsonify({"error": "Usuário não encontrado"}), 404

    usuario.nome = data.get("nome", usuario.nome)
    usuario.email = data.get("email", usuario.email)
    usuario.salario_mensal = data.get("salario_mensal", usuario.salario_mensal)

    db.session.commit()

    return jsonify({"message": "Usuário atualizado com sucesso"}), 200
############################## ALTERA INFORMAÇÕES DE USUÁRIO ##############################

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

############################## SOMA CONTAS FIXAS PARA DASHBOARD ##############################
@dashboard_bp.route("/somacontasfixas", methods=["GET"])
def soma_contas_fixas():
    user_id = request.args.get("user_id", type=int)

    if not user_id:
        return jsonify({"error": "ID do usuário é obrigatório"}), 400

    usuario = Usuario.query.get(user_id)

    if not usuario:
        return jsonify({"error": "Usuário não encontrado"}), 404

    soma = db.session.query(db.func.sum(ContaFixa.valor)).filter_by(usuario_id=user_id, ativa=True).scalar() or 0

    return jsonify({
        "soma_contas_fixas": float(soma)
    }), 200
############################## SOMA CONTAS FIXAS PARA DASHBOARD ##############################

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

############################# ALTERAR CONTAS FIXAS #################################
@contas_fixas_bp.route("/alterar/<int:conta_id>", methods=["PUT"])
def alterar_conta_fixa(conta_id):
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "JSON inválido ou ausente"}), 400

    conta_fixa = db.session.get(ContaFixa, conta_id)
    if not conta_fixa:
        return jsonify({"error": "Conta fixa não encontrada"}), 404

    if "nome" in data:
        conta_fixa.nome = data["nome"]

    if "valor" in data:
        if data["valor"] < 0:
            return jsonify({"error": "Valor inválido"}), 400
        conta_fixa.valor = data["valor"]

    if "dia_vencimento" in data:
        if not 1 <= data["dia_vencimento"] <= 31:
            return jsonify({"error": "Dia de vencimento inválido"}), 400
        conta_fixa.dia_vencimento = data["dia_vencimento"]

    if "ativa" in data:
        conta_fixa.ativa = data["ativa"]

    db.session.commit()

    return jsonify({
        "message": "Conta fixa alterada com sucesso",
        "conta_fixa": {
            "id": conta_fixa.id,
            "nome": conta_fixa.nome,
            "valor": float(conta_fixa.valor),
            "dia_vencimento": conta_fixa.dia_vencimento,
            "ativa": conta_fixa.ativa
        }
    }), 200
############################# DELETAR CONTAS FIXAS #################################
@contas_fixas_bp.route("/deletar/<int:conta_id>", methods=["DELETE"])
def deletar_conta_fixa(conta_id):
    conta_fixa = db.session.get(ContaFixa, conta_id)
    if not conta_fixa:
        return jsonify({"error": "Conta fixa não encontrada"}), 404

    db.session.delete(conta_fixa)
    db.session.commit()
    return jsonify({"message": "Conta fixa deletada com sucesso"}), 200
############################# DELETAR CONTAS FIXAS #################################

############################# ADICIONAR GASTO DIÁRIO #################################
registro_bp = Blueprint(
    "registro",
    __name__,
    url_prefix="/registro"
)

@registro_bp.route("/adicionar", methods=["POST"])
def adicionar_gasto_diario():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "JSON inválido ou ausente"}), 400

    user_id = data.get("user_id")
    descricao = data.get("descricao")
    valor = data.get("valor")
    categoria = data.get("categoria")
    data_registro = data.get("data_registro")

    if not user_id or not descricao or valor is None or not categoria or not data_registro:
        return jsonify({"error": "Dados obrigatórios ausentes"}), 400
    
    try:
        data_registro = datetime.fromisoformat(data_registro)
    except ValueError:
        return jsonify({"error": "Data inválida"}), 400
    
    gasto_diario = RegistroDiario(
        usuario_id=user_id,
        descricao=descricao,
        valor=valor,
        categoria=categoria,
        data_registro=data_registro
    )

    db.session.add(gasto_diario)
    db.session.commit()

    return jsonify({
        "message": "Gasto diário criado com sucesso",
        "gasto_diario": {
            "id": gasto_diario.id,
            "descricao": gasto_diario.descricao,
            "valor": float(gasto_diario.valor),
            "categoria": gasto_diario.categoria,
            "data_registro": gasto_diario.data_registro
        }
    }), 201
############################# ADICIONAR GASTO DIÁRIO #################################

############################# MOSTRAR GASTOS #################################
@registro_bp.route("/mostrar/<int:user_id>", methods=["GET"])
def mostrar_gastos(user_id):
    gastos = RegistroDiario.query.filter_by(usuario_id=user_id).all()
    if not gastos:
        return jsonify({"error": "Nenhum gasto encontrado para o usuário"}), 404

    return jsonify({
        "gastos": [
            {
                "id": gasto.id,
                "descricao": gasto.descricao,
                "valor": float(gasto.valor),
                "categoria": gasto.categoria,
                "data_registro": gasto.data_registro
            } for gasto in gastos
        ]
    }), 200
############################# MOSTRAR GASTOS #################################

############################# ALTERAR GASTOS #################################
@registro_bp.route("/alterar/<int:gasto_id>", methods=["PUT"])
def alterar_gasto(gasto_id):
    gasto = db.session.get(RegistroDiario, gasto_id)
    if not gasto:
        return jsonify({"error": "Gasto não encontrado"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "JSON inválido ou ausente"}), 400

    descricao = data.get("descricao")
    valor = data.get("valor")
    categoria = data.get("categoria")

    if descricao is not None:
        gasto.descricao = descricao
    if valor is not None:
        gasto.valor = valor
    if categoria is not None:
        gasto.categoria = categoria

    db.session.commit()
    return jsonify({
        "message": "Gasto alterado com sucesso",
        "gasto": {
            "id": gasto.id,
            "descricao": gasto.descricao,
            "valor": float(gasto.valor),
            "categoria": gasto.categoria,
            "data_registro": gasto.data_registro
        }
    }), 200
############################# ALTERAR GASTOS #################################

############################# DELETAR GASTOS #################################
@registro_bp.route("/deletar/<int:gasto_id>", methods=["DELETE"])
def deletar_gasto(gasto_id):
    gasto = db.session.get(RegistroDiario, gasto_id)
    if not gasto:
        return jsonify({"error": "Gasto não encontrado"}), 404

    db.session.delete(gasto)
    db.session.commit()
    return jsonify({"message": "Gasto deletado com sucesso"}), 200
############################# DELETAR GASTOS #################################
