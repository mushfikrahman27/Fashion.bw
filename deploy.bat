@echo off
echo Deploying Fashion Website to Firebase Hosting...
echo.

echo Step 1: Logging into Firebase...
firebase login

echo.
echo Step 2: Deploying to Firebase...
firebase deploy

echo.
echo Deployment complete!
echo Your website will be available at: https://my-1st-site-09.web.app
echo.
pause
