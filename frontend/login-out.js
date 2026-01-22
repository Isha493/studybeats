// 1. SELECT THE LOGOUT BUTTON
const logoutBtn = document.getElementById('logoutBtn');

// 2. LOGOUT CORE LOGIC
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        // Clear all StudyBeats data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        
        // Optional: clear everything to be safe
        // localStorage.clear(); 

        // Visual feedback (optional)
        console.log("Session ended. Redirecting...");

        // Redirect to login page
        window.location.href = 'login.html';
    });
}

// 3. THE "SECURITY GUARD" (Auth Check)
// Run this immediately when the page starts to prevent "Flash of Unauthenticated Content"
(function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        // No token found, redirect to login immediately
        window.location.href = 'login.html';
    }
})();