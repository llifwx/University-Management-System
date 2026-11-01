"""Fail closed on migration errors, then replace the process with the API server."""

import os
import subprocess
import sys

subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
os.execv(
    sys.executable,
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"],
)
