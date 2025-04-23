# TikTok Scheduler App

A web application for scheduling TikTok posts using TikTok's API. The app authenticates users with TikTok and allows them to schedule posts for later publishing.

## Features

- TikTok OAuth authentication with PKCE
- User profile display
- Post scheduling interface
- Scheduled posts management

## Architecture

The application consists of two main parts:

1. **Frontend**: React application (this repository)
2. **Backend**: Django REST API

## Local Development Setup

### Backend Setup

1. Clone the backend repository
2. Create a Python virtual environment:
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```
3. Install dependencies:
```
pip install -r requirements.txt
```
4. Run migrations:
```
python manage.py migrate
```
5. Start the development server:
```
python manage.py runserver
```

### Frontend Setup

1. Install dependencies:
```
npm install
```
2. Start the development server:
```
npm run dev
```

## TikTok API Authentication

The app uses TikTok's OAuth 2.0 flow with PKCE (Proof Key for Code Exchange) for secure authentication:

1. Generate a code verifier and code challenge
2. Redirect user to TikTok authorization page with the code challenge
3. TikTok redirects back with an authorization code
4. Exchange the authorization code for an access token using the code verifier
5. Use the access token to make API requests

## Deployment on Render.com

### Backend Deployment

1. Create a new Web Service on Render.com
2. Link your backend repository
3. Use the following settings:
   - Environment: Python
   - Build Command: `./build.sh`
   - Start Command: `gunicorn tiktok_project.wsgi:application`
4. Add the following environment variables:
   - `DEBUG`: set to "False"
   - `SECRET_KEY`: a secure random string
   - `TIKTOK_CLIENT_KEY`: your TikTok app client key
   - `TIKTOK_CLIENT_SECRET`: your TikTok app client secret
   - `RENDER_EXTERNAL_HOSTNAME`: will be automatically set by Render
   - `RENDER_FRONTEND_URL`: URL of your frontend deployment

### Frontend Deployment

1. Create a new Static Site on Render.com
2. Link your frontend repository
3. Use the following settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`

### Connecting Frontend to Backend

After deployment, use the "Configure Render URL" link in the app to set up your backend URL. This ensures the frontend knows where to send API requests.
"# scheduler-frontend.github.io" 
