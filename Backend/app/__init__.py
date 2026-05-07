from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .extensions import db
import os

jwt = JWTManager()

def create_app(test_config=None):
    app = Flask(__name__)

    # 🔹 Config padrão
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 60 * 60 * 24 * 30  # 30 dias

    if test_config:
        app.config.update(test_config)


    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        raise RuntimeError("SQLALCHEMY_DATABASE_URI não foi configurado.")

    db.init_app(app)
    jwt.init_app(app)
    CORS(app)

    # 🔹 Blueprints
    from app.routes import auth_bp
    app.register_blueprint(auth_bp)

    from app.routes import dashboard_bp 
    app.register_blueprint(dashboard_bp)
    
    from app.routes import contas_fixas_bp 
    app.register_blueprint(contas_fixas_bp)
    
    from app.routes import registro_bp 
    app.register_blueprint(registro_bp)

    from app.routes import parcelas_bp
    app.register_blueprint(parcelas_bp)

    if not app.config.get("TESTING"):
        with app.app_context():
            from . import models
            db.create_all()

    return app