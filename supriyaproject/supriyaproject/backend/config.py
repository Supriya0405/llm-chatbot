import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DOCS_PATH = os.getenv("DOCS_PATH", "docs")
