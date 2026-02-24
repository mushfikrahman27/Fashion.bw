// admin/js/auth.js

// 1. Firebase settings import kora (uporer folder theke)
import { auth } from '../../firebase-config.js'; 

// 2. Firebase-er built-in login function gulo niye asa
import { 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 3. HTML-er element gulo ke dhora
const loginBtn = document.getElementById('loginBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageBox = document.getElementById('message');

// 4. Login Function
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value;
        const password = passwordInput.value;

        // Firebase diye login check kora
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Login safol hole alert dibe ar dashboard-e niye jabe
                alert("Login Successful!");
                window.location.href = "dashboard.html"; 
            })
            .catch((error) => {
                // Jodi vul email/password den, tahole error dekhabe
                messageBox.innerText = "Email ba Password vul hoyeche!";
                console.error(error.message);
            });
    });
}