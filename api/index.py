"""
Kerala Tourism Chatbot — Vercel Serverless Entry Point
This file is what Vercel calls to handle all requests.
"""
import sys
import os

# Allow imports from the backend directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import app

# Vercel calls this `app` object as the WSGI handler
