async function loadProfile() {
    if (!window._supabase) {
        setTimeout(loadProfile, 500);
        return;
    }

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) { 
            window.location.href = 'login.html'; 
            return; 
        }

        const metadata = user.user_metadata;
        const name = metadata.username || user.email.split('@')[0];
        const avatarUrl = metadata.avatar_url;

        document.getElementById('displayEmail').textContent = user.email;
        document.getElementById('displayUsername').textContent = name;
        
        const imgEl = document.getElementById('profileImage');
        const letterEl = document.getElementById('avatarLetter');

        if (avatarUrl) {
            imgEl.src = avatarUrl;
            imgEl.style.display = 'block';
            letterEl.style.display = 'none';
        } else {
            imgEl.style.display = 'none';
            letterEl.style.display = 'block';
            letterEl.textContent = name.charAt(0).toUpperCase();
        }

        // 2. Load Stats from BOTH tables
        const [sessionRes, taskRes] = await Promise.all([
            _supabase.from('study_sessions').select('seconds_total, created_at').eq('user_id', user.id),
            _supabase.from('tasks').select('created_at').eq('user_id', user.id).eq('is_completed', true)
        ]);

        const sessionData = sessionRes.data || [];
        const taskData = taskRes.data || [];

        // Calculate Total Time (Still only from music/timer sessions)
        let totalSeconds = sessionData.reduce((acc, s) => acc + Number(s.seconds_total || 0), 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        document.getElementById('totalTime').textContent = `${hours}h ${minutes}m`;

        // --- NEW STREAK LOGIC (Merged Sessions + Tasks) ---
        // Get all dates where you were active
        const allDates = [
            ...sessionData.map(s => new Date(s.created_at).toDateString()),
            ...taskData.map(t => new Date(t.created_at).toDateString())
        ];

        // Remove duplicates and sort newest to oldest
        const uniqueDates = [...new Set(allDates)].map(d => new Date(d));
        uniqueDates.sort((a, b) => b - a);

        let streak = 0;
        if (uniqueDates.length > 0) {
            let today = new Date();
            today.setHours(0, 0, 0, 0);
            
            let lastDate = new Date(uniqueDates[0]);
            lastDate.setHours(0, 0, 0, 0);

            // Calculate days since last activity
            const dayDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            
            // If active today or yesterday, streak is alive
            if (dayDiff <= 1) {
                streak = 1;
                for (let i = 0; i < uniqueDates.length - 1; i++) {
                    const d1 = new Date(uniqueDates[i]).setHours(0,0,0,0);
                    const d2 = new Date(uniqueDates[i+1]).setHours(0,0,0,0);
                    const diff = Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
                    
                    if (diff === 1) streak++;
                    else if (diff === 0) continue; // Same day activity, keep going
                    else break;
                }
            }
        }
        document.getElementById('streakCount').textContent = streak;

        renderHeatmap();

    } catch (err) {
        console.error("Profile Load Error:", err.message);
    }
}