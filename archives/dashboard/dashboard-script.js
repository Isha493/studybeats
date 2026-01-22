/**
 * StudyBeats Dashboard - Session Tracker
 * Handles: Fetching study history and clearing database records.
 */

async function loadCloudHistory() {
    const historyBody = document.getElementById('sessionHistory');
    const totalTimeEl = document.getElementById('totalTime');
    const genreEl = document.getElementById('mostUsedGenre');
    const countEl = document.getElementById('sessionCount');

    // Wait for Supabase to initialize from global.js
    if (!window.supabaseClient) {
        setTimeout(loadCloudHistory, 500);
        return;
    }

    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        // Fetch sessions for the logged-in user
        const { data, error } = await supabaseClient
            .from('study_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (historyBody) historyBody.innerHTML = '';
        let totalSeconds = 0;
        let genreCounts = {};

        data.forEach(session => {
            if (historyBody) {
                const row = document.createElement('tr');
                const date = new Date(session.created_at).toLocaleDateString();
                row.innerHTML = `
                    <td>${date}</td>
                    <td><span style="color:#1db954; font-weight:bold;">${session.genre}</span></td>
                    <td>${session.duration}</td>
                `;
                historyBody.appendChild(row);
            }
            totalSeconds += (session.seconds_total || 0);
            genreCounts[session.genre] = (genreCounts[session.genre] || 0) + 1;
        });

        // Update Stats Cards
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        if(totalTimeEl) totalTimeEl.textContent = `${hours}h ${minutes}m`;
        
        const topGenre = Object.keys(genreCounts).length > 0 
            ? Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b) 
            : "---";
            
        if(genreEl) genreEl.textContent = topGenre;
        if(countEl) countEl.textContent = data.length;

    } catch (err) { 
        console.error("Load Error:", err.message); 
    }
}

async function clearAllHistory() {
    if (confirm("Delete records forever? This will wipe your history from the cloud.")) {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return alert("User not found. Please log in again.");

            // 1. Visually clear the table immediately (Anti-flicker)
            const historyBody = document.getElementById('sessionHistory');
            if (historyBody) historyBody.innerHTML = '<tr><td colspan="3">Clearing...</td></tr>';

            // 2. Perform the delete in Supabase
            const { error } = await supabaseClient
                .from('study_sessions')
                .delete()
                .eq('user_id', user.id);

            if (error) {
                throw error;
            }

            // 3. Success - Reload to refresh all stat cards
            console.log("Database cleared successfully.");
            location.reload(); 

        } catch (err) {
            console.error("Delete failed:", err.message);
            alert("Error: Make sure you have added the DELETE policy in Supabase SQL Editor.");
            location.reload(); // Refresh to show data is still there if delete failed
        }
    }
}

function updateNavButton() {
    const genres = ['rock', 'party', 'soothing', 'indie'];
    const sessionBtn = document.getElementById('sessionActionBtn');
    if (!sessionBtn) return;
    
    let runningGenre = null;
    genres.forEach(genre => { 
        if (localStorage.getItem(genre + 'TimerRunning') === 'true') runningGenre = genre; 
    });

    if (runningGenre) {
        sessionBtn.innerText = "Current Session";
        sessionBtn.classList.add('glow-active');
        sessionBtn.onclick = () => { location.href = '../' + runningGenre + '.html'; };
    } else {
        sessionBtn.innerText = "Start New Session";
        sessionBtn.classList.remove('glow-active');
        sessionBtn.onclick = () => { location.href = '../index.html'; };
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    loadCloudHistory();
    updateNavButton();
});