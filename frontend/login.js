/**
 * StudyBeats Login Logic - Master Shell Version
 */

const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');
const signupBtn = document.getElementById('signupBtn'); 

// Password Toggle logic
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.classList.toggle('fa-eye-slash');
});

// Cloud Login Logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Check if global.js has finished connecting
    if (!window.supabaseClient) {
        alert("Connecting to cloud... please try again in a second.");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const loginBtn = loginForm.querySelector('.btn-login');

    try {
        if (loginBtn) loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        // Log in via Supabase Auth
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            alert(error.message);
            if (loginBtn) loginBtn.innerText = 'Login';
        } else {
            console.log("Login Success!", data);
            
            // --- UPDATED STORAGE LOGIC ---
            // We save the token so Supabase knows we are logged in
            localStorage.setItem('token', data.session.access_token);
            // We save the User ID so MongoDB knows which study stats to fetch
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('userEmail', data.user.email);
            
            // --- THE REDIRECT FIX ---
            // Send the user to the SHELL, which contains the music player and sidebar
            // Make sure the path to shell/app.html is correct relative to login.html
            window.location.href = 'appmusic/index.html'; 
        }
    } catch (err) {
        console.error("Critical error:", err);
        alert("An unexpected error occurred. Check your internet connection.");
        if (loginBtn) loginBtn.innerText = 'Login';
    }
});

// Signup Redirect
if (signupBtn) {
    signupBtn.addEventListener('click', () => {
        window.location.href = 'signup.html';
    });
}