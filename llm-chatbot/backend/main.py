from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")

app = FastAPI()

# Allow requests from frontend (Vite default port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],  # all frontend ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set Gemini API key
genai.configure(api_key=GEMINI_API_KEY)

# Create a model
model = genai.GenerativeModel("gemini-1.5-flash")

# Define request body structure
class QueryRequest(BaseModel):
    prompt: str

# Root endpoint to test
@app.get("/")
async def root():
    return {"message": "FastAPI backend is running."}

# POST endpoint to receive prompt and send to Gemini
@app.post("/query")
async def query(request: QueryRequest):
    try:
        response = model.generate_content(request.prompt)
        return {"response": response.text}
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            return {"error": "Rate limit exceeded. Please wait a moment and try again, or enable billing in Google AI Studio for higher limits."}
        return {"error": error_msg}
