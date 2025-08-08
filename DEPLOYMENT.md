# Deployment Guide

## Environment Variables

You need to set the following environment variables in your Render dashboard:

1. `GOOGLE_API_KEY` - Your Google Gemini API key
2. `GEMINI_API_KEY` - Alternative name for the same API key

## Deployment Steps

1. The `requirements.txt` file has been updated with all necessary dependencies
2. The `Procfile` has been created to start the FastAPI server
3. Push your changes to GitHub
4. Render will automatically redeploy

## API Endpoints

- `GET /` - Health check endpoint
- `POST /query` - Send prompts to Gemini AI

## Webhook URL

Once deployed, your webhook URL will be:
`https://your-app-name.onrender.com/query`

## Troubleshooting

If you get "uvicorn: command not found" error:
1. Make sure `uvicorn` is in your `requirements.txt`
2. Check that the `Procfile` points to the correct module path
3. Ensure all dependencies are properly listed in `requirements.txt`
