let timeLeft;
let timerId = null;
let totalDuration;
let sessionSecondsElapsed = 0; 

const circle = document.getElementById('progressCircle');
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;
circle.style.strokeDasharray = `${circumference} ${circumference}`;

// --- LIVE CLOCK ---
function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: false 
        });
    }
}
setInterval(updateClock, 1000);
updateClock();

// --- TIMER CORE ---
function setTimer(minutes) {
    stopTimerLogic(); 
    timeLeft = minutes * 60;
    totalDuration = timeLeft;
    sessionSecondsElapsed = 0; 
    updateDisplay();
    updateProgress();
    
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('timerStatus').textContent = "Ready to focus?";
    
    document.querySelectorAll('.duration-presets button').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(minutes));
    });
}

function updateDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    document.getElementById('timerDisplay').textContent = 
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateProgress() {
    const offset = circumference - (timeLeft / totalDuration) * circumference;
    circle.style.strokeDashoffset = offset;
}

// --- DATABASE SYNC ---
async function saveProgressToDashboard() {
    if (sessionSecondsElapsed < 1) return; 

    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return;

        console.log(`Attempting to save ${sessionSecondsElapsed}s...`);

        // We send to BOTH column names to satisfy "Not Null" constraints in Supabase
        const { error } = await _supabase.from('study_sessions').insert([{
            user_id: user.id,
            duration: sessionSecondsElapsed,      
            seconds_total: sessionSecondsElapsed, 
            genre: 'Focus Session',
            created_at: new Date().toISOString()
        }]);

        if (error) {
            console.error("Supabase Error:", error.message);
        } else {
            console.log("Success! Data saved to dashboard.");
            sessionSecondsElapsed = 0; 
        }
    } catch (err) {
        console.error("Sync Error:", err.message);
    }
}

// --- CONTROLS ---
function stopTimerLogic() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
        saveProgressToDashboard(); 
    }
}

document.getElementById('startBtn').onclick = () => {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';
    document.getElementById('timerStatus').textContent = "Stay Focused";

    timerId = setInterval(() => {
        timeLeft--;
        sessionSecondsElapsed++; 
        updateDisplay();
        updateProgress();

        if (timeLeft <= 0) {
            stopTimerLogic();
            setTimer(totalDuration / 60);
            alert("Goal reached! Session saved.");
        }
    }, 1000);
};

document.getElementById('pauseBtn').onclick = () => {
    stopTimerLogic();
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('timerStatus').textContent = "Session Saved";
};

document.getElementById('resetBtn').onclick = () => {
    stopTimerLogic();
    setTimer(totalDuration / 60);
};

// Add this to your Timer Start function
async function broadcastLiveStatus(isStudying) {
    const { data: { user } } = await _supabase.auth.getUser();
    await _supabase.from('profiles').update({ 
        status: isStudying ? 'Studying' : 'Idle' 
    }).eq('id', user.id);
}

setTimer(25);