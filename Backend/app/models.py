from datetime import date
from werkzeug.security import generate_password_hash, check_password_hash
from .extensions import db


class Usuario(db.Model):
    __tablename__ = "usuario"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    senha_hash = db.Column(db.String(50), nullable=False)
    salario_mensal = db.Column(db.Numeric(10, 2), nullable=False)

    contas_fixas = db.relationship(
        "ContaFixa", backref="usuario", cascade="all, delete-orphan"
    )
    parcelamentos = db.relationship(
        "Parcelamento", backref="usuario", cascade="all, delete-orphan"
    )
    registros_diarios = db.relationship(
        "RegistroDiario", backref="usuario", cascade="all, delete-orphan"
    )
    historicos_fatura = db.relationship(
        "HistoricoFatura", backref="usuario", cascade="all, delete-orphan"
    )

    # # Segurança
    # def set_password(self, password):
    #     self.senha_hash = generate_password_hash(password)

    # def check_password(self, password):
    #     return check_password_hash(self.senha_hash, password)


class ContaFixa(db.Model):
    __tablename__ = "conta_fixa"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuario.id"), nullable=False)

    nome = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Numeric(10, 2), nullable=False)
    dia_vencimento = db.Column(db.Integer, nullable=False)
    ativa = db.Column(db.Boolean, default=True)


class Parcelamento(db.Model):
    __tablename__ = "parcelamento"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuario.id"), nullable=False)

    descricao = db.Column(db.String(150), nullable=False)
    valor_total = db.Column(db.Numeric(10, 2), nullable=False)
    valor_parcela = db.Column(db.Numeric(10, 2), nullable=False)
    parcelas_totais = db.Column(db.Integer, nullable=False)
    parcelas_restantes = db.Column(db.Integer, nullable=False)
    data_inicio = db.Column(db.Date, nullable=False)
    ativo = db.Column(db.Boolean, default=True)


class RegistroDiario(db.Model):
    __tablename__ = "registro_diario"

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuario.id"), nullable=False)

    descricao = db.Column(db.String(150))
    categoria = db.Column(db.String(50))
    valor = db.Column(db.Numeric(10, 2), nullable=False)
    data_registro = db.Column(db.Date, default=date.today, nullable=False)


class HistoricoFatura(db.Model):
    __tablename__ = "historico_fatura"
    __table_args__ = (
        db.UniqueConstraint("usuario_id", "ano", "mes", name="uq_usuario_mes_ano"),
    )

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuario.id"), nullable=False)

    ano = db.Column(db.Integer, nullable=False)
    mes = db.Column(db.Integer, nullable=False)

    total_gastos_registro = db.Column(db.Numeric(10, 2), nullable=False)
    total_contas_fixas = db.Column(db.Numeric(10, 2), nullable=False)
    total_parcelamentos = db.Column(db.Numeric(10, 2), nullable=False)
    saldo_final = db.Column(db.Numeric(10, 2), nullable=False)
