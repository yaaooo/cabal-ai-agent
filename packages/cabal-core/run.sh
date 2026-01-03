#!/bin/bash
# Startup script for Lambda Web Adapter
# This script starts the Uvicorn web server that serves the FastAPI application
exec python -m uvicorn cabal:app --host 0.0.0.0 --port 8080
