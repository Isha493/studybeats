const quotes = [
    "\"Focus on being productive instead of busy.\"",
    "\"The secret of getting ahead is getting started.\"",
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
    // UPDATED: Fetching both tables so streak is accurate
    const [sessionRes, taskRes] = await Promise.all([
        _supabase.from('study_sessions').select('*').eq('user_id', user.id),
        _supabase.from('tasks').select('created_at').eq('user_id', user.id).eq('is_completed', true)
    ]);

    const sessions = sessionRes.data || [];
    const tasks = taskRes.data || [];

    // --- 1. XP & LEVEL CALCULATION (Original Logic) ---
    const totalSecs = sessions.reduce((acc, s) => acc + Number(s.duration || s.seconds_total || 0), 0);
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

    // --- 2. DAILY GOAL PROGRESS (Original Logic) ---
    const todayStr = new Date().toDateString();
    const todaySecs = sessions.filter(s => new Date(s.created_at).toDateString() === todayStr)
                             .reduce((acc, s) => acc + Number(s.duration || s.seconds_total || 0), 0);
    
    const goalPercent = Math.min((todaySecs / (goalHours * 3600)) * 100, 100);
    document.getElementById('progressBar').style.width = goalPercent + "%";
    document.getElementById('goalPercentage').textContent = Math.round(goalPercent) + "%";

    // --- 3. PERIOD FOCUS (Original Logic) ---
    const lastReset = user.user_metadata?.focus_reset_at || new Date(0).toISOString();
    const periodSecs = sessions.filter(s => new Date(s.created_at) >= new Date(lastReset))
                               .reduce((acc, s) => acc + Number(s.duration || s.seconds_total || 0), 0);
    document.getElementById('totalFocusTime').textContent = `${Math.floor(periodSecs/3600)}h ${Math.floor((periodSecs%3600)/60)}m`;

    // --- 4. UNIFIED STREAK (The Fix) ---
    const combinedDates = [
        ...sessions.map(s => new Date(s.created_at).toDateString()),
        ...tasks.map(t => new Date(t.created_at).toDateString())
    ];
    
    const uniqueDates = [...new Set(combinedDates)].map(d => new Date(d));
    uniqueDates.sort((a, b) => b - a);

    let streak = 0;
    if (uniqueDates.length > 0) {
        let today = new Date().toDateString();
        let lastDate = uniqueDates[0].toDateString();
        const dayDiff = Math.floor((new Date(today) - new Date(lastDate)) / 86400000);

        if (dayDiff <= 1) {
            streak = 1;
            for (let i = 0; i < uniqueDates.length - 1; i++) {
                const diff = Math.floor((uniqueDates[i] - uniqueDates[i+1]) / 86400000);
                if (diff === 1) streak++;
                else if (diff === 0) continue;
                else break;
            }
        }
    }
    document.getElementById('streakCount').textContent = streak;
}

// --- GOAL SETTER ---
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
        location.reload(); 
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