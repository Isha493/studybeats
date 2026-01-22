/**
 * StudyBeats Global Master Script - CLOUD VERSION
 */

const SB_URL = 'https://trafswsijeyryikiopht.supabase.co'; 
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYWZzd3NpamV5cnlpa2lvcGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQwMTksImV4cCI6MjA4NDA0MDAxOX0.ScXfZe1P7bNIL8YYLE_JRLZPuoq48U7lVnkrGfGiE6Q';

// Define both variables globally so every file is happy
let supabaseClient;
let _supabase;

/**
 * AGGRESSIVE INITIALIZATION
 */
function connectToCloud() {
    if (window.supabase) {
        const client = window.supabase.createClient(SB_URL, SB_KEY);
        
        // The Bridge: Both names now point to the same active connection
        supabaseClient = client;
        _supabase = client;
        
        // Attach to window object to be 100% sure other files can see them
        window.supabaseClient = client;
        window._supabase = client;

        console.log("✅ StudyBeats Cloud: Connected & Bridged!");
    } else {
        console.log("⏳ Waiting for Supabase library...");
        setTimeout(connectToCloud, 500);
    }
}

connectToCloud();

/**
 * 2. UPDATED SECURITY CHECK
 * Prevents redirect loops and handles Vercel root paths
 */
(function checkAuth() {
    const authCheck = async () => {
        if (!supabaseClient) {
            setTimeout(authCheck, 500);
            return;
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        
        // Get current filename and full path
        const path = window.location.pathname;
        const currentPage = path.split("/").pop();

        // Whitelist pages that DON'T need a login
        // Note: index.html removed so it's now protected!
        const isAuthPage = 
            currentPage === 'login.html' || 
            currentPage === 'signup.html';

        if (!session && !isAuthPage) {
            console.log("No active session found. Protecting page...");
            window.location.href = '/login.html';
        } else {
            // If logged in OR on a login page, make the body visible
            document.body.style.visibility = "visible";
        }
    };
    authCheck();
})();

/**
 * CLOUD SAVE FUNCTION
 */
async function saveAndCloseSession(genreName, elapsedTime, displayTime) {
    if (!supabaseClient) {
        console.warn("Database not ready, trying to reconnect...");
        await new Promise(res => setTimeout(res, 1000));
        if (!supabaseClient) {
            saveLocally(genreName, displayTime);
            return;
        }
    }

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error("No user logged in");

        const { error } = await supabaseClient
            .from('study_sessions')
            .insert([{ 
                user_id: user.id, // Explicitly link to current user
                genre: genreName, 
                duration: displayTime, 
                seconds_total: Math.floor(elapsedTime / 1000) 
            }]);

        if (error) throw error;
        console.log("🚀 Cloud Save Success!");
        
        // Clean up local storage state after successful cloud save
        localStorage.removeItem('activeGenre');
        localStorage.setItem('studySessionActive', 'false');

    } catch (err) {
        console.error("Save failed:", err.message);
        saveLocally(genreName, displayTime);
    }
}

function saveLocally(genre, duration) {
    const history = JSON.parse(localStorage.getItem('studySessions')) || [];
    history.unshift({ date: new Date().toLocaleDateString(), genre, duration });
    localStorage.setItem('studySessions', JSON.stringify(history));
    console.log("📦 Saved to Local Storage (Backup)");
}

function resumeSession() {
    const active = localStorage.getItem('activeGenre');
    if (active) window.location.href = active.toLowerCase() + '.html';
}