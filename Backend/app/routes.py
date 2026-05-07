import token
from flask import Blueprint, app, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import jwt
from pydantic import BaseModel, ValidationError, constr
from app.extensions import db
from app.models import ContaFixa, RegistroDiario, Usuario, Parcelamento, HistoricoFatura
from datetime import date, datetime, timedelta
from sqlalchemy import func, text
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import time
import re
from sqlalchemy.exc import SQLAlchemyError
from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError
# Total de rotas = 26 (28/04/2026)
######################################## BLUEPRINTS DE ROTAS ########################################
auth_bp = Blueprint("auth", __name__)
contas_fixas_bp = Blueprint("contas_fixas", __name__, url_prefix="/contas-fixas")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")
parcelas_bp = Blueprint("parcelas", __name__, url_prefix="/parcelas")
registro_bp = Blueprint("registro", __name__, url_prefix="/registro")
######################################## BLUEPRINTS DE ROTAS ########################################
limiter = Limiter(key_func=get_remote_address)
#######################################SCHEMA DE ROTAS########################################
class LoginSchema(BaseModel):
    nome: constr(min_length=3, max_length=60)
    senha_hash: constr(min_length=1, max_length=128)

LOGIN_MAX_FAILED_ATTEMPTS = 5
#######################################SCHEMA DE ROTAS########################################

#######################################TRATAMENTO DE JWT EM ROTAS########################################
@jwt.unauthorized_loader # Tratamento de Token Ausente
def unauthorized_response(callback):
    return jsonify({
        "ok": False,
        "error": "Token de autenticação ausente ou inválido"
    }), 401

@jwt.invalid_token_loader # Tratamento de Token Inválido
def invalid_token_loader(callback):
    return jsonify({
        "ok": False,
        "error": "Assinatura de token inválida"
    }), 401


@jwt.expired_token_loader # Tratamento de Token Expirado
def expired_token_response(jwt_header, jwt_payload):
    return jsonify({
        "ok": False,
        "error": "Token expirou. Faça login novamente."
    }), 401

@auth_bp.app_errorhandler(NoAuthorizationError) # Tratamento de Erro de Autorização
def no_authorization_error(e):
    return jsonify({
        "ok": False,
        "error": "Acesso não autorizado"
    }), 401
@auth_bp.app_errorhandler(InvalidHeaderError) # Tratamento de Erro de Cabeçalho JWT
def invalid_header_error(e):
    return jsonify({
        "ok": False,
        "error": "Cabeçalho de autenticação inválido"
    }), 401
#######################################TRATAMENTO DE JWT EM ROTAS########################################





######################################## AUTENTICAÇÃO DE USUÁRIO ########################################
############################## REGISTRO DE USUÁRIO ##############################
@auth_bp.route("/auth/register", methods=["POST"])
def register():
    # 'silent=True' evita o erro 415 automático do Flask e permite que retornemos 400 personalizado
    data = request.get_json(silent=True)

    # Verificação de Payload Nulo/Malformado
    if data is None:
        return jsonify({"error": "Requisição inválida. O corpo deve ser um JSON válido."}), 400

    # 1. Definição de limites e extração (Anti-DoS)
    # Mantive 'senha_hash' conforme seu banco, mas lembre-se: o conteúdo é o texto puro vindo do front
    nome = data.get("nome")
    email = data.get("email")
    senha_hash = data.get("senha_hash")
    salario = data.get("salario_mensal")
    nome_normalizado = str(nome).strip() if nome is not None else ""
    limite_nome = 60

    # Validação de presença
    if not all([nome_normalizado, email, senha_hash]):
        return jsonify({"error": "Dados obrigatórios ausentes"}), 400

    # Bloqueia nomes longos antes de qualquer processamento adicional
    if len(str(nome_normalizado)) > limite_nome:
        return jsonify({"error": f"Nome excede o limite de {limite_nome} caracteres"}), 413
    
    # Validação de TAMANHO (Proteção contra sobrecarga de memória e CPU)
    if len(str(email)) > 120 or len(str(senha_hash)) > 128:
        return jsonify({"error": "Entrada de dados excede o limite permitido"}), 413

    # 2. Validação de Formato e Normalização (Sanitização)
    email = email.lower().strip()
    email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
    if not re.match(email_regex, email):
        return jsonify({"error": "Formato de e-mail inválido"}), 400

    # 3. Tratamento de Enumeração (Proteção de privacidade)
    if Usuario.query.filter_by(email=email).first():
        return jsonify({"error": "Não foi possível concluir o registro"}), 409

    # 4. Tipagem explícita e tratamento financeiro (Anti-Mass Assignment / Logic Error)
    try:
        # Garante que o salário é um float válido mesmo que venha como string
        salario_validado = float(salario) if salario is not None else 0.0
        if salario_validado < 0:
            return jsonify({"error": "O salário não pode ser negativo"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "Salário deve ser um valor numérico"}), 400

    # Criação do objeto com dados limpos
    novo_usuario = Usuario(
        nome=nome_normalizado, 
        email=email, 
        salario_mensal=salario_validado
    )
    novo_usuario.set_password(senha_hash)

    try:
        db.session.add(novo_usuario)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Logar o erro 'e' internamente, mas retornar mensagem genérica
        return jsonify({"error": "Erro interno ao salvar os dados"}), 500

    # Retorno estruturado para passar no seu teste (incluindo o e-mail)
    return jsonify({
        "message": "Usuário cadastrado com sucesso",
        "usuario": {
            "id": novo_usuario.id, 
            "nome": novo_usuario.nome,
            "email": novo_usuario.email
        }
    }), 201
############################## REGISTRO DE USUÁRIO ##############################

############################# LOGIN DE USUÁRIO #################################
@auth_bp.route("/auth/login", methods=["POST"])
@limiter.limit("5 per minute") # Rate limit deve vir após a rota para funcionar no Flask-Limiter
def login():
    try:
        json_data = request.get_json(silent=True)
        if json_data is None or not isinstance(json_data, dict) or not json_data:
            return jsonify({"error": "Dados obrigatórios ausentes."}), 400

        nome_raw = json_data.get("nome")
        senha_raw = json_data.get("senha_hash")
        if not isinstance(nome_raw, str) or not isinstance(senha_raw, str):
            return jsonify({"error": "Formato de dados inválido"}), 400

        # Validação do Schema
        data = LoginSchema(**json_data)
    except ValidationError:
        return jsonify({"error": "Formato de dados inválido"}), 400
    except Exception:
        return jsonify({"error": "Formato de dados inválido"}), 400

    nome_key = data.nome.strip().lower()
    failed_attempts = current_app.config.setdefault("LOGIN_FAILED_ATTEMPTS", {})
    if failed_attempts.get(nome_key, 0) >= LOGIN_MAX_FAILED_ATTEMPTS:
        return jsonify({"error": "Muitas tentativas de login. Tente novamente mais tarde."}), 429

    # Busca do usuário
    usuario = Usuario.query.filter_by(nome=data.nome).first()

    # Verificação de credenciais (Trata usuário não encontrado e senha incorreta com 401)
    if not usuario or not usuario.check_password(data.senha_hash):
        failed_attempts[nome_key] = failed_attempts.get(nome_key, 0) + 1
        return jsonify({"error": "Credenciais inválidas"}), 401

    failed_attempts.pop(nome_key, None)
    
    # Geração de Token
    token = create_access_token(
        identity=str(usuario.id), 
        expires_delta=timedelta(minutes=15) 
    )

    return jsonify({
        "message": "Login realizado com sucesso",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "token": token
        }
    }), 200
############################## LOGIN DE USUÁRIO ##############################
######################################## AUTENTICAÇÃO DE USUÁRIO ########################################














################################################ CONFIGURAÇÕES ################################################

############################## BUSCA INFORMAÇÕES DE USUÁRIO ##############################
@auth_bp.route("/auth/info", methods=["GET"])
@jwt_required()
def get_user_info():
    try:
        # 1. Recuperação segura da identidade
        raw_identity = get_jwt_identity()
        if not raw_identity:
            return jsonify({"error": "Identidade do token inválida"}), 401
            
        user_id = int(raw_identity)

        # 2. Busca com tratamento de erro de conexão/sessão
        usuario = db.session.get(Usuario, user_id)

        if usuario is None:
            # Retornamos 401 ou 404. Em sistemas financeiros, 401 é mais seguro 
            # para indicar que a sessão atual não é mais válida.
            return jsonify({"error": "Usuário não encontrado ou sessão expirada"}), 401

        # 3. Retorno sanitizado
        return jsonify({
            "usuario": {
                "id": usuario.id,
                "nome": usuario.nome,
                "email": usuario.email,
                # Garante que dados financeiros sejam sempre numéricos e seguros
                "salario_mensal": round(float(usuario.salario_mensal or 0), 2)
            }
        }), 200

    except ValueError:
        return jsonify({"error": "Formato de token inválido"}), 400
    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Ocorreu um erro interno"}), 500
############################## BUSCA INFORMAÇÕES DE USUÁRIO ##############################

############################## ALTERA INFORMAÇÕES DE USUÁRIO ##############################
@auth_bp.route("/auth/alterar", methods=["PUT"])
@jwt_required()
def update_user():
    try:
        # 1. Recuperação da identidade do Token (Fonte da Verdade)
        user_id_from_token = get_jwt_identity()
        
        # 'silent=True' evita erro 415 se o Content-Type estiver errado
        data = request.get_json(silent=True)

        if not data:
            return jsonify({"error": "Dados não fornecidos"}), 400

        # --- NOVA VALIDAÇÃO DE NOME (OBRIGATÓRIO E NÃO VAZIO) ---
        if "nome" in data:
            nome_limpo = str(data["nome"]).strip()
            if not nome_limpo: # Verifica se é vazio ou apenas espaços
                return jsonify({"error": "O nome não pode estar vazio"}), 400
            if len(nome_limpo) > 100: # Proteção contra DoS/Buffer
                return jsonify({"error": "Nome excede o limite de caracteres"}), 413
            data["nome"] = nome_limpo # Atualiza com o valor sanitizado
        # -------------------------------------------------------

        # 2. Validação contra Injeção de ID (Prevenção de IDOR)
        if "id" in data and str(data["id"]) != str(user_id_from_token):
            return jsonify({"error": "Tentativa de alteração não autorizada"}), 403

        # 3. Busca rigorosa no banco de dados
        usuario = db.session.get(Usuario, int(user_id_from_token))

        if not usuario:
            return jsonify({"error": "Usuário inexistente ou conta desativada"}), 404

        # 4. Validação de formato de E-mail
        if "email" in data:
            email_limpo = str(data["email"]).lower().strip()
            if "@" not in email_limpo or len(email_limpo) < 5:
                return jsonify({"error": "Formato de e-mail inválido"}), 400
            # Adicional: Verificar se o novo e-mail já existe em outra conta
            email_existente = Usuario.query.filter(Usuario.email == email_limpo, Usuario.id != usuario.id).first()
            if email_existente:
                return jsonify({"error": "Este e-mail já está em uso por outra conta"}), 409
            usuario.email = email_limpo

        # 5. Atualização controlada
        if "nome" in data:
            usuario.nome = data["nome"]
        
        if "salario_mensal" in data:
            try:
                val = float(data["salario_mensal"])
                if val < 0: raise ValueError
                usuario.salario_mensal = val
            except (ValueError, TypeError):
                return jsonify({"error": "Valor de salário inválido"}), 400

        # 6. Persistência
        db.session.commit()

        return jsonify({
            "message": "Dados atualizados com sucesso",
            "usuario": {
                "nome": usuario.nome,
                "email": usuario.email,
            }
        }), 200

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        return jsonify({"error": "Erro interno ao processar a solicitação"}), 500
############################## ALTERA INFORMAÇÕES DE USUÁRIO ##############################

################################################ CONFIGURAÇÕES ################################################











######################################## INFORMAÇÕES DO DASHBOARD ########################################

############################## BUSCA SALÁRIO PARA DASHBOARD ##############################

@dashboard_bp.route("/salariomensal", methods=["GET"])
@jwt_required()
def get_salario_mensal():
    try:
        # 1. Fonte da Verdade: Identidade do Token JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        # 2. Busca segura usando db.session.get() (método atualizado)
        usuario = db.session.get(Usuario, int(user_id_from_token))

        if not usuario:
            return jsonify({"error": "Usuário não encontrado ou sessão expirada"}), 401

        # 3. Retorno sanitizado (Princípio do Menor Privilégio)
        return jsonify({
            "salario_mensal": round(float(usuario.salario_mensal or 0), 2)
        }), 200

    except ValueError:
        return jsonify({"error": "Formato de token inválido"}), 400
    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Ocorreu um erro interno"}), 500
############################## BUSCA SALÁRIO PARA DASHBOARD ##############################

############################## SOMA CONTAS FIXAS PARA DASHBOARD ##############################
@dashboard_bp.route("/somacontasfixas", methods=["GET"])
@jwt_required()
def soma_contas_fixas():
    try:
        # 1. Fonte da Verdade: Identidade do Token JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        # 2. Verifica se o usuário existe
        usuario = db.session.get(Usuario, int(user_id_from_token))
        if not usuario:
            return jsonify({"error": "Usuário não encontrado ou sessão expirada"}), 401

        # 3. Soma segura com escopo restrito ao usuário logado
        soma = db.session.query(db.func.sum(ContaFixa.valor)).filter_by(
            usuario_id=int(user_id_from_token), 
            ativa=True
        ).scalar() or 0

        return jsonify({
            "soma_contas_fixas": round(float(soma), 2)
        }), 200

    except ValueError:
        return jsonify({"error": "Formato de token inválido"}), 400
    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Ocorreu um erro interno"}), 500
############################## SOMA CONTAS FIXAS PARA DASHBOARD ##############################

############################# TOTAL GASTO POR MÊS/ANO #################################
@dashboard_bp.route("/total-gasto-mes-dashboard", methods=["GET"])
@jwt_required()
def total_gasto_mes():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        mes = datetime.now().month
        ano = datetime.now().year

        if not mes or not ano:
            return jsonify({"error": "Mês e ano são obrigatórios"}), 400
        if not 1 <= mes <= 12:
            return jsonify({"error": "Mês deve ser entre 1 e 12"}), 400
        if ano < 2000 or ano > 2100:
            return jsonify({"error": "Ano inválido"}), 400

        # 2. Consulta restrita ao dono do token
        total = db.session.query(func.sum(RegistroDiario.valor)).filter(
            RegistroDiario.usuario_id == int(user_id_from_token),
            db.extract('month', RegistroDiario.data_registro) == mes,
            db.extract('year', RegistroDiario.data_registro) == ano
        ).scalar() or 0

        count = db.session.query(func.count(RegistroDiario.id)).filter(
            RegistroDiario.usuario_id == int(user_id_from_token),
            db.extract('month', RegistroDiario.data_registro) == mes,
            db.extract('year', RegistroDiario.data_registro) == ano
        ).scalar() or 0

        return jsonify({
            "total": round(float(total), 2),
            "gastos": int(count)
        }), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao calcular total"}), 500
############################# TOTAL GASTO POR MÊS/ANO #################################

######################################## INFORMAÇÕES DO DASHBOARD ########################################











################################################## CONTAS ##################################################

############################# CRIAR NOVA CONTA FIXA #################################
@contas_fixas_bp.route("/create", methods=["POST"])
@jwt_required()
def create_conta_fixa():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR / Anti-Mass Assignment)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        data = request.get_json(silent=True)
        if data is None or not isinstance(data, dict):
            return jsonify({"error": "Requisição inválida. O corpo deve ser um JSON válido."}), 400

        # 2. Extração e validação de campos
        nome = data.get("nome")
        valor = data.get("valor")
        dia_vencimento = data.get("dia_vencimento")

        if not nome or valor is None or dia_vencimento is None:
            return jsonify({"error": "Dados obrigatórios ausentes"}), 400

        # 3. Sanitização e limites (Anti-DoS)
        nome_limpo = str(nome).strip()
        if not nome_limpo:
            return jsonify({"error": "Nome da conta não pode estar vazio"}), 400
        if len(nome_limpo) > 100:
            return jsonify({"error": "Nome excede o limite de 100 caracteres"}), 413

        # 4. Tipagem e validação financeira
        try:
            valor_validado = float(valor)
            if valor_validado < 0:
                return jsonify({"error": "Valor não pode ser negativo"}), 400
            if valor_validado > 999999999.99:
                return jsonify({"error": "Valor excede o limite permitido"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Valor deve ser um número válido"}), 400

        # 5. Validação de dia de vencimento
        try:
            dia_validado = int(dia_vencimento)
            if not 1 <= dia_validado <= 31:
                return jsonify({"error": "Dia de vencimento deve ser entre 1 e 31"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Dia de vencimento inválido"}), 400

        # 6. Criação com ID do token (nunca do body)
        conta_fixa = ContaFixa(
            usuario_id=int(user_id_from_token),
            nome=nome_limpo,
            valor=valor_validado,
            dia_vencimento=dia_validado,
            ativa=bool(data.get("ativa", True))
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

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao criar conta fixa"}), 500
############################# CRIAR NOVA CONTA FIXA #################################

############################# LISTAR CONTAS FIXAS #################################
@contas_fixas_bp.route("/minhascontas", methods=["GET"])
@jwt_required()
def listar_contas_fixas():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        # 2. Verifica existência do usuário
        user = db.session.get(Usuario, int(user_id_from_token))
        if not user:
            return jsonify({"error": "Usuário não encontrado ou sessão expirada"}), 401

        # 3. Busca restrita ao dono do token
        contas = (
            ContaFixa.query
            .filter_by(usuario_id=int(user_id_from_token))
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

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao listar contas"}), 500
############################# LISTAR CONTAS FIXAS #################################

############################# ALTERAR CONTAS FIXAS #################################
@contas_fixas_bp.route("/alterar/<int:conta_id>", methods=["PUT"])
@jwt_required()
def alterar_conta_fixa(conta_id):
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({"error": "JSON inválido ou ausente"}), 400

        # 2. Busca a conta
        conta_fixa = db.session.get(ContaFixa, conta_id)
        if not conta_fixa:
            return jsonify({"error": "Conta fixa não encontrada"}), 404

        # 3. Verificação de propriedade (Anti-IDOR)
        if str(conta_fixa.usuario_id) != str(user_id_from_token):
            return jsonify({"error": "Acesso não autorizado a esta conta"}), 403

        # 4. Validação e sanitização de nome
        if "nome" in data:
            nome_limpo = str(data["nome"]).strip()
            if not nome_limpo:
                return jsonify({"error": "Nome não pode estar vazio"}), 400
            if len(nome_limpo) > 100:
                return jsonify({"error": "Nome excede o limite de 100 caracteres"}), 413
            conta_fixa.nome = nome_limpo

        # 5. Validação de valor
        if "valor" in data:
            try:
                valor_validado = float(data["valor"])
                if valor_validado < 0:
                    return jsonify({"error": "Valor não pode ser negativo"}), 400
                if valor_validado > 999999999.99:
                    return jsonify({"error": "Valor excede o limite permitido"}), 400
                conta_fixa.valor = valor_validado
            except (ValueError, TypeError):
                return jsonify({"error": "Valor deve ser um número válido"}), 400

        # 6. Validação de dia de vencimento
        if "dia_vencimento" in data:
            try:
                dia_validado = int(data["dia_vencimento"])
                if not 1 <= dia_validado <= 31:
                    return jsonify({"error": "Dia de vencimento deve ser entre 1 e 31"}), 400
                conta_fixa.dia_vencimento = dia_validado
            except (ValueError, TypeError):
                return jsonify({"error": "Dia de vencimento inválido"}), 400

        # 7. Campo booleano com tipagem explícita
        if "ativa" in data:
            conta_fixa.ativa = bool(data["ativa"])

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

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao alterar conta fixa"}), 500
############################# ALTERAR CONTAS FIXAS #################################
@contas_fixas_bp.route("/deletar/<int:conta_id>", methods=["DELETE"])
@jwt_required()
def deletar_conta_fixa(conta_id):
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        # 2. Busca a conta
        conta_fixa = db.session.get(ContaFixa, conta_id)
        if not conta_fixa:
            return jsonify({"error": "Conta fixa não encontrada"}), 404

        # 3. Verificação de propriedade (Anti-IDOR)
        if str(conta_fixa.usuario_id) != str(user_id_from_token):
            return jsonify({"error": "Acesso não autorizado a esta conta"}), 403

        # 4. Deleção segura
        db.session.delete(conta_fixa)
        db.session.commit()

        return jsonify({"message": "Conta fixa deletada com sucesso"}), 200

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao deletar conta fixa"}), 500
############################# DELETAR CONTAS FIXAS #################################

################################################## CONTAS ##################################################




################################################## GASTOS DIÁRIOS ##################################################

############################# ADICIONAR GASTO DIÁRIO #################################

############################# MOSTRAR GASTOS #################################
@registro_bp.route("/mostrar", methods=["GET"])
@jwt_required()
def mostrar_gastos():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        # 2. Busca restrita ao dono do token
        gastos = RegistroDiario.query.filter_by(usuario_id=int(user_id_from_token)).all()
        if not gastos:
            return jsonify({"gastos": []}), 200

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

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao listar gastos"}), 500
############################# MOSTRAR GASTOS #################################

############################# ADICIONAR GASTO DIÁRIO #################################
@registro_bp.route("/adicionar", methods=["POST"])
@jwt_required()
def adicionar_gasto_diario():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR / Anti-Mass Assignment)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        data = request.get_json(silent=True)
        if data is None or not isinstance(data, dict):
            return jsonify({"error": "Requisição inválida. O corpo deve ser um JSON válido."}), 400

        descricao = data.get("descricao")
        valor = data.get("valor")
        categoria = data.get("categoria")
        data_registro = data.get("data_registro")

        if not descricao or valor is None or not categoria or not data_registro:
            return jsonify({"error": "Dados obrigatórios ausentes"}), 400

        # 2. Sanitização e limites (Anti-DoS)
        descricao_limpa = str(descricao).strip()
        if not descricao_limpa:
            return jsonify({"error": "Descrição não pode estar vazia"}), 400
        if len(descricao_limpa) > 300:
            return jsonify({"error": "Descrição excede o limite de 300 caracteres"}), 413

        # 3. Validação de categoria (whitelist)
        categorias_validas = ["Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Compras", "Outros"]
        categoria_limpa = str(categoria).strip()
        if categoria_limpa not in categorias_validas:
            return jsonify({"error": "Categoria inválida. Escolha entre: " + ", ".join(categorias_validas)}), 400

        # 4. Tipagem e validação financeira
        try:
            valor_validado = float(valor)
            if valor_validado < 0:
                return jsonify({"error": "Valor não pode ser negativo"}), 400
            if valor_validado > 999999999.99:
                return jsonify({"error": "Valor excede o limite permitido"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Valor deve ser um número válido"}), 400

        # 5. Validação de data
        try:
            data_registro_dt = datetime.fromisoformat(str(data_registro))
        except ValueError:
            return jsonify({"error": "Data inválida. Use o formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS)"}), 400

        # 6. Criação com ID do token (nunca do body)
        gasto_diario = RegistroDiario(
            usuario_id=int(user_id_from_token),
            descricao=descricao_limpa,
            valor=valor_validado,
            categoria=categoria_limpa,
            data_registro=data_registro_dt
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

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao criar gasto diário"}), 500
############################# ADICIONAR GASTO DIÁRIO #################################


############################# ALTERAR GASTOS #################################
@registro_bp.route("/alterar/<int:gasto_id>", methods=["PUT"])
@jwt_required()
def alterar_gasto(gasto_id):
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({"error": "JSON inválido ou ausente"}), 400

        # 2. Busca o gasto
        gasto = db.session.get(RegistroDiario, gasto_id)
        if not gasto:
            return jsonify({"error": "Gasto não encontrado"}), 404

        # 3. Verificação de propriedade (Anti-IDOR)
        if str(gasto.usuario_id) != str(user_id_from_token):
            return jsonify({"error": "Acesso não autorizado a este gasto"}), 403

        # 4. Validação e sanitização de descrição
        if "descricao" in data:
            descricao_limpa = str(data["descricao"]).strip()
            if not descricao_limpa:
                return jsonify({"error": "Descrição não pode estar vazia"}), 400
            if len(descricao_limpa) > 300:
                return jsonify({"error": "Descrição excede o limite de 300 caracteres"}), 413
            gasto.descricao = descricao_limpa

        # 5. Validação de valor
        if "valor" in data:
            try:
                valor_validado = float(data["valor"])
                if valor_validado < 0:
                    return jsonify({"error": "Valor não pode ser negativo"}), 400
                if valor_validado > 999999999.99:
                    return jsonify({"error": "Valor excede o limite permitido"}), 400
                gasto.valor = valor_validado
            except (ValueError, TypeError):
                return jsonify({"error": "Valor deve ser um número válido"}), 400

        # 6. Validação de categoria (whitelist)
        if "categoria" in data:
            categorias_validas = ["Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Compras", "Outros"]
            categoria_limpa = str(data["categoria"]).strip()
            if categoria_limpa not in categorias_validas:
                return jsonify({"error": "Categoria inválida"}), 400
            gasto.categoria = categoria_limpa

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

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao alterar gasto"}), 500
############################# ALTERAR GASTOS #################################

############################# DELETAR GASTOS #################################
@registro_bp.route("/deletar/<int:gasto_id>", methods=["DELETE"])
@jwt_required()
def deletar_gasto(gasto_id):
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        # 2. Busca o gasto
        gasto = db.session.get(RegistroDiario, gasto_id)
        if not gasto:
            return jsonify({"error": "Gasto não encontrado"}), 404

        # 3. Verificação de propriedade (Anti-IDOR)
        if str(gasto.usuario_id) != str(user_id_from_token):
            return jsonify({"error": "Acesso não autorizado a este gasto"}), 403

        # 4. Deleção segura
        db.session.delete(gasto)
        db.session.commit()

        return jsonify({"message": "Gasto deletado com sucesso"}), 200

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao deletar gasto"}), 500
############################# DELETAR GASTOS #################################















############################# TOTAL GASTO POR MÊS/ANO #################################
@registro_bp.route("/total-gasto-mes/<int:mes>/<int:ano>", methods=["GET"])
@jwt_required()
def total_gasto_mes():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        mes = request.args.get("mes", type=int) or datetime.now().month
        ano = request.args.get("ano", type=int) or datetime.now().year

        if not mes or not ano:
            return jsonify({"error": "Mês e ano são obrigatórios"}), 400
        if not 1 <= mes <= 12:
            return jsonify({"error": "Mês deve ser entre 1 e 12"}), 400
        if ano < 2000 or ano > 2100:
            return jsonify({"error": "Ano inválido"}), 400

        # 2. Consulta restrita ao dono do token
        total = db.session.query(func.sum(RegistroDiario.valor)).filter(
            RegistroDiario.usuario_id == int(user_id_from_token),
            db.extract('month', RegistroDiario.data_registro) == mes,
            db.extract('year', RegistroDiario.data_registro) == ano
        ).scalar() or 0

        count = db.session.query(func.count(RegistroDiario.id)).filter(
            RegistroDiario.usuario_id == int(user_id_from_token),
            db.extract('month', RegistroDiario.data_registro) == mes,
            db.extract('year', RegistroDiario.data_registro) == ano
        ).scalar() or 0

        return jsonify({
            "total": round(float(total), 2),
            "gastos": int(count)
        }), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao calcular total"}), 500
############################# TOTAL GASTO POR MÊS/ANO #################################

############################# TOTAL GASTO POR CATEGORIA MÊS/ANO #################################
@registro_bp.route("/total-gasto-categoria/<int:mes>/<int:ano>", methods=["GET"])
@jwt_required()
def total_gasto_categoria():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        mes = request.args.get("mes", type=int) or datetime.now().month
        ano = request.args.get("ano", type=int) or datetime.now().year

        if not mes or not ano:
            return jsonify({"error": "Mês e ano são obrigatórios"}), 400
        if not 1 <= mes <= 12:
            return jsonify({"error": "Mês deve ser entre 1 e 12"}), 400
        if ano < 2000 or ano > 2100:
            return jsonify({"error": "Ano inválido"}), 400

        # 2. Consulta restrita ao dono do token
        categorias = ["Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Compras", "Outros"]
        resultados = db.session.query(
            RegistroDiario.categoria,
            func.sum(RegistroDiario.valor)
        ).filter(
            RegistroDiario.usuario_id == int(user_id_from_token),
            db.extract('month', RegistroDiario.data_registro) == mes,
            db.extract('year', RegistroDiario.data_registro) == ano
        ).group_by(RegistroDiario.categoria).all()

        resultado = {categoria: 0.0 for categoria in categorias}
        for categoria, total in resultados:
            if categoria in resultado:
                resultado[categoria] = round(float(total), 2)

        return jsonify({
            "total_por_categoria": resultado
        }), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao calcular totais"}), 500
############################# TOTAL GASTO POR CATEGORIA MÊS/ANO #################################

############################# PERCENTUAL DE CATEGORIA MÊS/ANO #################################
@registro_bp.route("/percentual-gasto-categoria/<int:mes>/<int:ano>", methods=["GET"])
@jwt_required()
def percentual_gasto_categoria():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        mes = request.args.get("mes", type=int) or datetime.now().month
        ano = request.args.get("ano", type=int) or datetime.now().year

        if not mes or not ano:
            return jsonify({"error": "Mês e ano são obrigatórios"}), 400
        if not 1 <= mes <= 12:
            return jsonify({"error": "Mês deve ser entre 1 e 12"}), 400
        if ano < 2000 or ano > 2100:
            return jsonify({"error": "Ano inválido"}), 400

        # 2. Consulta restrita ao dono do token
        categorias = ["Alimentação", "Transporte", "Lazer", "Saúde", "Educação", "Compras", "Outros"]

        total = db.session.query(func.sum(RegistroDiario.valor)).filter(
            RegistroDiario.usuario_id == int(user_id_from_token),
            db.extract('month', RegistroDiario.data_registro) == mes,
            db.extract('year', RegistroDiario.data_registro) == ano
        ).scalar() or 0

        if total == 0:
            return jsonify({"percentual_por_categoria": {cat: 0.0 for cat in categorias}}), 200

        resultado = {}
        for categoria in categorias:
            total_categoria = db.session.query(func.sum(RegistroDiario.valor)).filter(
                RegistroDiario.usuario_id == int(user_id_from_token),
                RegistroDiario.categoria == categoria,
                db.extract('month', RegistroDiario.data_registro) == mes,
                db.extract('year', RegistroDiario.data_registro) == ano
            ).scalar() or 0
            percentual = round((float(total_categoria) / float(total)) * 100, 2)
            resultado[categoria] = percentual

        return jsonify({
            "percentual_por_categoria": resultado
        }), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao calcular percentuais"}), 500
############################# PERCENTUAL DE CATEGORIA MÊS/ANO #################################

















############################# TOTAL GASTO POR ANO #################################
@registro_bp.route("/total-gasto-ano", methods=["GET"])
@jwt_required()
def total_gasto_ano():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        ano = request.args.get("ano", type=int) or datetime.now().year
        if not ano:
            return jsonify({"error": "Ano é obrigatório"}), 400
        if ano < 2000 or ano > 2100:
            return jsonify({"error": "Ano inválido"}), 400

        # 2. Consulta restrita ao dono do token
        total = db.session.query(func.sum(RegistroDiario.valor)).filter(
            RegistroDiario.usuario_id == int(user_id_from_token),
            db.extract('year', RegistroDiario.data_registro) == ano
        ).scalar() or 0

        count = db.session.query(func.count(RegistroDiario.id)).filter(
            RegistroDiario.usuario_id == int(user_id_from_token),
            db.extract('year', RegistroDiario.data_registro) == ano
        ).scalar() or 0

        return jsonify({
            "total": round(float(total), 2),
            "gastos": int(count)
        }), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao calcular total"}), 500
############################# TOTAL GASTO POR ANO #################################

############################# TOTAL GASTO POR MÊS POR USUÁRIO DIVIDIDO POR MÊS DO ANO #################################
@registro_bp.route("/total-gasto-mes-ano", methods=["GET"])
@jwt_required()
def total_gasto_mes_ano():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        ano = request.args.get("ano", type=int) or datetime.now().year
        if ano < 2000 or ano > 2100:
            return jsonify({"error": "Ano inválido"}), 400

        user_id_int = int(user_id_from_token)

        # 2. Consultas restritas ao dono do token
        gastos_diarios = (
            db.session.query(
                db.extract('month', RegistroDiario.data_registro).label('mes'),
                func.sum(RegistroDiario.valor).label('total')
            )
            .filter(RegistroDiario.usuario_id == user_id_int)
            .filter(db.extract('year', RegistroDiario.data_registro) == ano)
            .group_by('mes')
            .all()
        )

        total_contas_fixas = (
            db.session.query(func.sum(ContaFixa.valor))
            .filter(ContaFixa.usuario_id == user_id_int)
            .scalar()
        )

        total_contas_fixas = float(total_contas_fixas or 0.0)
        resultado = {mes: round(total_contas_fixas, 2) for mes in range(1, 13)}
        for mes, total in gastos_diarios:
            resultado[int(mes)] += round(float(total), 2)

        return jsonify({
            "total_por_mes": resultado
        }), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao calcular totais"}), 500
############################# TOTAL GASTO POR MÊS POR USUÁRIO DIVIDIDO POR MÊS DO ANO #################################

################################################## GASTOS DIÁRIOS ##################################################











####################################### PÁGINA DE PARCELAS ###########################################

############################# CRIAR PARCELAS #################################
@parcelas_bp.route("/criar", methods=["POST"])
@jwt_required()
def criar_parcela():
    try:
        # 1. Fonte da Verdade: JWT (Anti-IDOR / Anti-Mass Assignment)
        user_id_from_token = get_jwt_identity()
        if not user_id_from_token:
            return jsonify({"error": "Identidade do token inválida"}), 401

        data = request.get_json(silent=True)
        if data is None or not isinstance(data, dict):
            return jsonify({"error": "Requisição inválida. O corpo deve ser um JSON válido."}), 400

        descricao = data.get("descricao")
        valor_total = data.get("valor_total")
        valor_parcela = data.get("valor_parcela")
        parcelas_totais = data.get("parcelas_totais")
        parcelas_restantes = data.get("parcelas_restantes")
        data_inicio_raw = data.get("data_inicio")

        if not descricao or valor_total is None or valor_parcela is None or parcelas_totais is None:
            return jsonify({"error": "Dados obrigatórios ausentes"}), 400

        # 2. Sanitização e limites
        descricao_limpa = str(descricao).strip()
        if not descricao_limpa:
            return jsonify({"error": "Descrição não pode estar vazia"}), 400
        if len(descricao_limpa) > 200:
            return jsonify({"error": "Descrição excede o limite de 200 caracteres"}), 413

        # 3. Validação financeira
        try:
            valor_total_validado = float(valor_total)
            valor_parcela_validado = float(valor_parcela)
            if valor_total_validado < 0 or valor_parcela_validado < 0:
                return jsonify({"error": "Valores não podem ser negativos"}), 400
            if valor_total_validado > 999999999.99 or valor_parcela_validado > 999999999.99:
                return jsonify({"error": "Valor excede o limite permitido"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Valores devem ser números válidos"}), 400

        # 4. Validação de parcelas
        try:
            parcelas_totais_int = int(parcelas_totais)
            if parcelas_totais_int < 1:
                return jsonify({"error": "Total de parcelas deve ser maior que zero"}), 400
            if parcelas_totais_int > 48:
                return jsonify({"error": "Total de parcelas excede o limite de 48"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Total de parcelas deve ser um número inteiro"}), 400

        parcelas_restantes_int = parcelas_totais_int
        if parcelas_restantes is not None:
            try:
                parcelas_restantes_int = int(parcelas_restantes)
                if parcelas_restantes_int < 0 or parcelas_restantes_int > parcelas_totais_int:
                    return jsonify({"error": "Parcelas restantes inválidas"}), 400
            except (ValueError, TypeError):
                return jsonify({"error": "Parcelas restantes deve ser um número inteiro"}), 400

        # 5. Validação de data
        data_inicio = None
        if data_inicio_raw:
            try:
                data_inicio = datetime.strptime(str(data_inicio_raw), '%Y-%m-%d').date()
            except ValueError:
                return jsonify({"error": "Data inválida. Use o formato YYYY-MM-DD"}), 400

        # 6. Verificação de duplicidade (com ID do token)
        parcelamento_existente = Parcelamento.query.filter_by(
            usuario_id=int(user_id_from_token),
            descricao=descricao_limpa,
            ativo=True
        ).first()

        if parcelamento_existente:
            return jsonify({"error": "Já existe um parcelamento em andamento com esta descrição"}), 409

        # 7. Criação com ID do token
        nova_parcela = Parcelamento(
            usuario_id=int(user_id_from_token),
            descricao=descricao_limpa,
            valor_total=valor_total_validado,
            valor_parcela=valor_parcela_validado,
            parcelas_totais=parcelas_totais_int,
            parcelas_restantes=parcelas_restantes_int,
            data_inicio=data_inicio,
            ativo=True
        )

        db.session.add(nova_parcela)
        db.session.commit()

        return jsonify({
            "message": "Parcelamento criado com sucesso",
            "parcela": {
                "id": nova_parcela.id,
                "descricao": nova_parcela.descricao,
                "valor_total": float(nova_parcela.valor_total),
                "valor_parcela": float(nova_parcela.valor_parcela),
                "parcelas_totais": nova_parcela.parcelas_totais,
                "parcelas_restantes": nova_parcela.parcelas_restantes,
                "data_inicio": nova_parcela.data_inicio.isoformat() if nova_parcela.data_inicio else None,
                "ativo": nova_parcela.ativo
            }
        }), 201

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao criar parcelamento"}), 500
############################# CRIAR PARCELA #################################

############################# BUSCAR PARCELAS #################################
@parcelas_bp.route("/mostrar", methods=["GET"])
@jwt_required()
def mostrar_parcelas():
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"error": "Identidade do token inválida"}), 401

        parcelas = Parcelamento.query.filter_by(
            usuario_id=int(current_user_id),
            ativo=True
        ).all()

        return jsonify([
            {
                "id": parcela.id,
                "descricao": parcela.descricao,
                "valor_total": round(float(parcela.valor_total), 2),
                "valor_parcela": round(float(parcela.valor_parcela), 2),
                "parcelas_totais": parcela.parcelas_totais,
                "parcelas_restantes": parcela.parcelas_restantes,
                "data_inicio": parcela.data_inicio.isoformat() if parcela.data_inicio else None,
                "ativo": parcela.ativo
            } for parcela in parcelas
        ]), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao listar parcelas"}), 500
############################# BUSCAR PARCELAS #################################

############################# EXCLUIR PARCELAS #################################
@parcelas_bp.route("/deletar/<int:parcela_id>", methods=["DELETE"])
@jwt_required()
def deletar_parcela(parcela_id):
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"error": "Identidade do token inválida"}), 401

        parcela = db.session.get(Parcelamento, parcela_id)
        if not parcela:
            return jsonify({"error": "Parcela não encontrada"}), 404

        if str(parcela.usuario_id) != str(current_user_id):
            return jsonify({"error": "Acesso não autorizado a esta parcela"}), 403

        parcela.ativo = False
        db.session.commit()
        return jsonify({"message": "Parcela deletada com sucesso"}), 200

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao deletar parcela"}), 500
############################# EXCLUIR PARCELAS #################################

############################# EDITAR PARCELAS #################################
@parcelas_bp.route("/editar/<int:parcela_id>", methods=["PUT"])
@jwt_required()
def editar_parcela(parcela_id):
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"error": "Identidade do token inválida"}), 401

        data = request.get_json(silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({"error": "JSON inválido ou ausente"}), 400

        parcela = db.session.get(Parcelamento, parcela_id)
        if not parcela:
            return jsonify({"error": "Parcela não encontrada"}), 404

        if str(parcela.usuario_id) != str(current_user_id):
            return jsonify({"error": "Acesso não autorizado a esta parcela"}), 403

        if "descricao" in data:
            descricao_limpa = str(data["descricao"]).strip()
            if not descricao_limpa:
                return jsonify({"error": "Descrição não pode estar vazia"}), 400
            if len(descricao_limpa) > 200:
                return jsonify({"error": "Descrição excede o limite de 200 caracteres"}), 413
            parcela.descricao = descricao_limpa

        if "valor_total" in data:
            try:
                valor = float(data["valor_total"])
                if valor < 0:
                    return jsonify({"error": "Valor total não pode ser negativo"}), 400
                if valor > 999999999.99:
                    return jsonify({"error": "Valor excede o limite permitido"}), 400
                parcela.valor_total = valor
            except (ValueError, TypeError):
                return jsonify({"error": "Valor total deve ser um número válido"}), 400

        if "data_inicio" in data:
            if data["data_inicio"]:
                try:
                    parcela.data_inicio = datetime.strptime(str(data["data_inicio"]), '%Y-%m-%d').date()
                except ValueError:
                    return jsonify({"error": "Data inválida. Use o formato YYYY-MM-DD"}), 400
            else:
                parcela.data_inicio = None

        db.session.commit()

        return jsonify({
            "message": "Parcela editada com sucesso",
            "parcela": {
                "id": parcela.id,
                "descricao": parcela.descricao,
                "valor_total": round(float(parcela.valor_total), 2),
                "valor_parcela": round(float(parcela.valor_parcela), 2),
                "parcelas_totais": parcela.parcelas_totais,
                "parcelas_restantes": parcela.parcelas_restantes,
                "data_inicio": parcela.data_inicio.isoformat() if parcela.data_inicio else None,
                "ativo": parcela.ativo
            }
        }), 200

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao editar parcela"}), 500
############################# EDITAR PARCELAS #################################

############################# DIMINUIR PARCELAS #################################
@parcelas_bp.route("/pagar/<int:parcela_id>", methods=["POST"])
@jwt_required()
def pagar_parcela(parcela_id):
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"error": "Identidade do token inválida"}), 401

        parcela = db.session.get(Parcelamento, parcela_id)
        if not parcela or str(parcela.usuario_id) != str(current_user_id):
            return jsonify({"error": "Parcelamento não encontrado ou acesso negado"}), 404

        if parcela.parcelas_restantes <= 0:
            return jsonify({"error": "Todas as parcelas já foram pagas"}), 400

        parcela.parcelas_restantes -= 1
        if parcela.parcelas_restantes == 0:
            parcela.ativo = False

        db.session.commit()

        return jsonify({
            "message": "Parcela paga com sucesso",
            "parcela": {
                "id": parcela.id,
                "descricao": parcela.descricao,
                "valor_total": round(float(parcela.valor_total), 2),
                "valor_parcela": round(float(parcela.valor_parcela), 2),
                "parcelas_totais": parcela.parcelas_totais,
                "parcelas_restantes": parcela.parcelas_restantes,
                "data_inicio": parcela.data_inicio.isoformat() if parcela.data_inicio else None,
                "ativo": parcela.ativo
            }
        }), 200

    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({"error": "Erro de persistência no banco de dados"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Erro interno ao processar pagamento"}), 500
############################# DIMINUIR PARCELAS #################################

############################# RESUMO DE PARCELAS #################################
@parcelas_bp.route("/resumo", methods=["GET"])
@jwt_required()
def resumo_parcelamentos():
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"error": "Identidade do token inválida"}), 401

        resumo = db.session.query(
            func.count(Parcelamento.id).label("total_ativos"),
            func.sum(Parcelamento.valor_parcela).label("soma_valores")
        ).filter(
            Parcelamento.usuario_id == int(current_user_id),
            Parcelamento.ativo == True
        ).first()

        total_ativos = resumo.total_ativos or 0
        soma_valores = round(float(resumo.soma_valores), 2) if resumo.soma_valores else 0.0

        return jsonify({
            "quantidade_ativos": total_ativos,
            "soma_total_mensal": soma_valores,
        }), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao calcular resumo"}), 500
############################# RESUMO DE PARCELAS #################################

############################# HISTÓRICO DE PARCELAMENTOS #################################
@parcelas_bp.route("/historico", methods=["GET"])
@jwt_required()
def historico_parcelamentos():
    try:
        current_user_id = get_jwt_identity()
        if not current_user_id:
            return jsonify({"error": "Identidade do token inválida"}), 401

        historico = Parcelamento.query.filter_by(
            usuario_id=int(current_user_id),
            ativo=False
        ).order_by(Parcelamento.data_inicio.desc()).all()

        return jsonify([
            {
                "id": parcela.id,
                "descricao": parcela.descricao,
                "valor_total": round(float(parcela.valor_total), 2),
                "valor_parcela": round(float(parcela.valor_parcela), 2),
                "parcelas_totais": parcela.parcelas_totais,
                "parcelas_restantes": parcela.parcelas_restantes,
                "data_inicio": parcela.data_inicio.isoformat() if parcela.data_inicio else None,
                "ativo": parcela.ativo
            } for parcela in historico
        ]), 200

    except SQLAlchemyError:
        return jsonify({"error": "Erro temporário de conexão com o banco"}), 503
    except Exception:
        return jsonify({"error": "Erro interno ao listar histórico"}), 500
############################# HISTÓRICO DE PARCELAMENTOS #################################

####################################### PÁGINA DE PARCELAS ###########################################

















####################################### CHECKS ###########################################
@auth_bp.route("/health-db")
def health_db():
    try:
        start = time.time()
        db.session.execute(text("SELECT 1"))
        latency = round((time.time() - start) * 1000, 2)

        return {
            "status": "ok",
            "latency_ms": latency
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}, 500
    
@auth_bp.route("/health")
def health():
    return {"status": "ok"}
####################################### CHECKS ###########################################
