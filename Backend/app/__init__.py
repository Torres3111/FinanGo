from dotenv import load_dotenv
from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .extensions import db, migrate
import os

load_dotenv()

jwt = JWTManager()

def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("SQL_ALCHEMY_DATABASE_URI")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("SECRET_KEY")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 60 * 60 * 24 * 30

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    from app.routes import auth_bp
    from app.routes import dashboard_bp 
    from app.routes import contas_fixas_bp 
    from app.routes import registro_bp 
    from app.routes import parcelas_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(contas_fixas_bp)
    app.register_blueprint(registro_bp)
    app.register_blueprint(parcelas_bp)

    with app.app_context():
        from . import models

    return app