const quotes = [
    "\"Focus on being productive instead of busy.\"",
    "\"The secret of getting ahead is getting started.\"",
    "\"Done is better than perfect.\"",
    "\"Your future self will thank you for today's work.\""
];

const ranks = ["Novice", "Scholar", "Expert", "Master", "Sage", "Legend"];

async function initDashboard() {
    if (!window._supabase) { setTimeout(initDashboard, 500); return; }
    
    const { data: { user }, error } = await _supabase.auth.getUser();
    if (!user || error) return;

    // Pull goal from metadata, default to 4
    const userGoal = parseInt(user.user_metadata?.daily_goal) || 4;
    
    // Update UI
    document.getElementById('welcomeText').textContent = `Welcome, ${user.user_metadata?.username || "Scholar"}`;
    document.getElementById('quoteDisplay').textContent = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('targetDisplay').textContent = userGoal;
    document.getElementById('goalInput').value = userGoal;

    loadStats(user, userGoal);
}

async function loadStats(user, goalHours) {
    const { data: sessions } = await _supabase.from('study_sessions').select('*').eq('user_id', user.id);
    if (!sessions) return;

    // --- 1. XP & LEVEL CALCULATION ---
    const totalSecs = sessions.reduce((acc, s) => acc + Number(s.duration || 0), 0);
    const totalHrs = totalSecs / 3600;
    
    const currentLevel = Math.floor(Math.sqrt(totalHrs)) + 1;
    const startHrs = Math.pow(currentLevel - 1, 2);
    const endHrs = Math.pow(currentLevel, 2);
    
    const hrsIntoLevel = totalHrs - startHrs;
    const hrsRange = endHrs - startHrs;
    const xpPercent = (hrsIntoLevel / hrsRange) * 100;

    document.getElementById('userLevel').textContent = currentLevel;
    document.getElementById('currentXP').textContent = totalHrs.toFixed(1);
    document.getElementById('nextLevelXP').textContent = endHrs;
    document.getElementById('rankTitle').textContent = ranks[Math.min(currentLevel - 1, ranks.length - 1)];
    document.getElementById('xpBar').style.width = Math.max(2, Math.min(xpPercent, 100)) + "%";

    // --- 2. DAILY GOAL PROGRESS ---
    const today = new Date().toDateString();
    const todaySecs = sessions.filter(s => new Date(s.created_at).toDateString() === today)
                              .reduce((acc, s) => acc + Number(s.duration || 0), 0);
    
    // Critical Math: Use the passed goalHours
    const goalPercent = Math.min((todaySecs / (goalHours * 3600)) * 100, 100);
    document.getElementById('progressBar').style.width = goalPercent + "%";
    document.getElementById('goalPercentage').textContent = Math.round(goalPercent) + "%";

    // --- 3. PERIOD FOCUS ---
    const lastReset = user.user_metadata?.focus_reset_at || new Date(0).toISOString();
    const periodSecs = sessions.filter(s => new Date(s.created_at) >= new Date(lastReset))
                               .reduce((acc, s) => acc + Number(s.duration || 0), 0);
    document.getElementById('totalFocusTime').textContent = `${Math.floor(periodSecs/3600)}h ${Math.floor((periodSecs%3600)/60)}m`;

    // --- 4. STREAK ---
    const dates = [...new Set(sessions.map(s => new Date(s.created_at).toDateString()))].sort((a,b) => new Date(b)-new Date(a));
    document.getElementById('streakCount').textContent = dates.length > 0 ? (Math.floor((new Date()-new Date(dates[0]))/86400000) <= 1 ? dates.length : 0) : 0;
}

// --- GOAL SETTER (THE FIX) ---
document.getElementById('setGoalBtn').onclick = async () => {
    const val = parseInt(document.getElementById('goalInput').value);
    
    if (isNaN(val) || val < 1 || val > 24) {
        alert("Please set a goal between 1 and 24 hours.");
        return;
    }

    const btn = document.getElementById('setGoalBtn');
    btn.textContent = "...";
    
    const { error } = await _supabase.auth.updateUser({
        data: { daily_goal: val }
    });

    if (!error) {
        location.reload(); // Refresh to recalculate bars with new goal
    } else {
        alert("Error: " + error.message);
        btn.textContent = "Set";
    }
};

document.getElementById('resetFocusBtn').onclick = async () => {
    if(confirm("Reset period counter? Your Level/XP will not be affected.")) {
        await _supabase.auth.updateUser({ data: { focus_reset_at: new Date().toISOString() } });
        location.reload();
    }
};

initDashboard();