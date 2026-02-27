# Fashion Website Deployment

## Project Overview
This is a static fashion e-commerce website with Firebase integration.

## Deployment Instructions

### Prerequisites
- Node.js and npm installed
- Firebase CLI installed: `npm install -g firebase-tools`

### Quick Deploy
1. Run the deployment script:
   ```bash
   deploy.bat
   ```

### Manual Deploy Steps
1. Login to Firebase:
   ```bash
   firebase login
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy
   ```

### Deployment URL
After deployment, your website will be available at:
- **Primary**: https://my-1st-site-09.web.app
- **Alternative**: https://my-1st-site-09.firebaseapp.com

## Firebase Configuration
- **Project ID**: my-1st-site-09
- **Hosting**: Configured for static files
- **Database**: Realtime Database for product data
- **Authentication**: Firebase Auth for user management
- **Storage**: Firebase Storage for media files

## File Structure
```
├── index.html          # Main page
├── style.css           # Styling
├── script.js           # Main JavaScript functionality
├── firebase-config.js  # Firebase configuration
├── firebase.json       # Firebase Hosting configuration
├── .firebaserc         # Firebase project settings
└── deploy.bat          # Deployment script
```

## Notes
- The site is configured as a Single Page Application (SPA)
- All routes are redirected to index.html
- Firebase hosting provides free SSL certificate and CDN
- Static assets are served from Firebase CDN for optimal performance
