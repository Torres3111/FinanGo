from flask import Flask
from flask_cors import CORS
from .extensions import db
import os


def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    from app.routes import auth_bp
    app.register_blueprint(auth_bp) # Resgistro de Rotas de Autenticação
    
    from app.routes import dashboard_bp 
    app.register_blueprint(dashboard_bp) # Resgistro de Rotas do Dashboard
    
    from app.routes import contas_fixas_bp 
    app.register_blueprint(contas_fixas_bp) # Resgistro de Rotas de Contas Fixas
    
    from app.routes import registro_bp 
    app.register_blueprint(registro_bp) # Resgistro de Rotas de Registro Diário
    
    with app.app_context():
        from . import models
        db.create_all()
    
    return app