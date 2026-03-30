# **📄 WEBSITE WORKING FILES LIST**

---

## **🎯 MAIN WEBSITE FILES**

### **HTML Files:**
- `index.html` - Main website homepage
- `recently-viewed.html` - Recently viewed products page

### **JavaScript Files:**
- `script.js` - Main website functionality
- `firebase-config.js` - Firebase configuration

### **CSS Files:**
- `style.css` - Main website styling

### **Configuration Files:**
- `firebase.json` - Firebase project configuration
- `firebase-rules.md` - Firebase security rules
- `.firebaserc` - Firebase CLI configuration

---

## **📁 SUBDIRECTORIES**

### **Assets:**
- `images/` - Website images and product photos

### **Admin Panel:**
- `admin/` - Complete admin panel system

### **Archive:**
- `archive-js/` - Archived JavaScript versions
- `finance-app/` - Finance application

---

## **✅ CURRENTLY ACTIVE FILES**

**Main Website:**
- **HTML:** `index.html`
- **JavaScript:** `script.js`
- **CSS:** `style.css`
- **Firebase:** `firebase-config.js`

**Dependencies:**
- Firebase SDK (loaded via CDN)
- Google Fonts (loaded via CDN)
- Local images from `images/` folder

---

## **🔗 FILE RELATIONSHIPS**

**index.html** loads:
1. `style.css` - Website styling
2. `script.js` - Main functionality
3. `firebase-config.js` - Database connection
4. Firebase SDKs - Database, auth, storage

**script.js** depends on:
- `firebase-config.js` - For `window.firebaseDB`
- Firebase SDK modules - For database operations
- `style.css` - For DOM manipulation styling

---

## **📊 SUMMARY**

**The website uses a clean architecture with:**
- **Single HTML file** (`index.html`)
- **Single JavaScript file** (`script.js`)
- **Single CSS file** (`style.css`)
- **Shared Firebase configuration** (`firebase-config.js`)
- **Local assets** (`images/` directory)
