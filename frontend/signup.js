const signupForm = document.getElementById('signupForm');

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Use the global client we initialized in global.js
    const _supabase = window._supabase || window.supabaseClient;

    if (!_supabase) {
        alert("Connecting to cloud... please try again in a moment.");
        return;
    }

    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const username = document.getElementById('regUsername').value;

    try {
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username // Passed to metadata for the SQL trigger
                }
            }
        });

        if (error) {
            alert("Signup Failed: " + error.message);
        } else {
            alert("Account created! Please check your email for a confirmation link.");
            window.location.href = 'login.html';
        }

    } catch (err) {
        console.error("Cloud Connection Error:", err);
        alert("Could not connect to the cloud.");
    }
});