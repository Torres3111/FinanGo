import os
import sys
from app import create_app, db
import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))