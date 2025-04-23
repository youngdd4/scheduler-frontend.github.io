# Deploying to Render.com

This guide provides step-by-step instructions for deploying the TikTok Scheduler app to Render.com.

## Prerequisites

1. A TikTok developer account with an app created
2. A Render.com account
3. Git repositories for both the backend and frontend code

## Backend Deployment

1. Log in to your Render.com account
2. Click "New" and select "Web Service"
3. Connect your GitHub repository or provide the repository URL
4. Configure the service with the following settings:
   - **Name**: tiktok-scheduler-backend
   - **Environment**: Python
   - **Region**: Choose the closest to your users
   - **Branch**: main (or your preferred branch)
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn tiktok_project.wsgi:application`
   - **Instance Type**: Free (for testing) or paid tier for production

5. Add the following environment variables:
   - `DEBUG`: `False`
   - `SECRET_KEY`: (generate a secure random string)
   - `TIKTOK_CLIENT_KEY`: Your TikTok app's client key
   - `TIKTOK_CLIENT_SECRET`: Your TikTok app's client secret
   - `RENDER_FRONTEND_URL`: URL of your frontend deployment (after it's deployed)

6. Click "Create Web Service"

## Frontend Deployment

1. Log in to your Render.com account
2. Click "New" and select "Static Site"
3. Connect your GitHub repository or provide the repository URL
4. Configure the service with the following settings:
   - **Name**: tiktok-scheduler-frontend
   - **Branch**: main (or your preferred branch)
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Environment Variables**: None needed for basic deployment

5. Click "Create Static Site"

## Connecting Frontend and Backend

After both services are deployed:

1. Copy the URL of your backend service (e.g., `https://tiktok-scheduler-backend.onrender.com`)
2. Go to your deployed frontend application
3. Click the "Configure Render URL" link at the bottom of the login page
4. Enter the backend URL in the provided field and save

## Updating TikTok Developer Settings

1. Log in to the TikTok Developer Portal
2. Navigate to your app settings
3. Update the Redirect URI to match your backend URL:
   - Format: `https://tiktok-scheduler-backend.onrender.com/api/tiktok/callback/`
4. Save your changes

## Testing the Deployment

1. Open your deployed frontend application
2. Click "Sign in with TikTok"
3. Complete the TikTok authorization flow
4. If successful, you should be redirected back to your app and see your TikTok profile information

## Troubleshooting

If you encounter issues:

1. Check the Render.com logs for both services
2. Verify your environment variables are set correctly
3. Ensure your TikTok app's redirect URI is configured properly
4. Test with the built-in error solutions page by clicking the "View detailed troubleshooting guide" link

## Going to Production

For a production deployment:

1. Upgrade to paid Render.com plans for better performance and reliability
2. Set up a custom domain for your services
3. Configure a proper database (PostgreSQL) instead of SQLite
4. Enable HTTPS for secure connections
5. Implement proper error monitoring and logging services 