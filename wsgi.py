"""
WSGI entry point for Vercel serverless deployment.
Vercel expects a module-level `app` WSGI callable.
"""
import os
import sys
from pathlib import Path

# Ensure project root is on the path
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

# Use relative paths for config in serverless environment
os.environ.setdefault("CONFIG_FILE", str(ROOT / "config.yml"))

from app import app  # noqa: E402 — import after path setup

# Vercel uses this as the WSGI handler
application = app
