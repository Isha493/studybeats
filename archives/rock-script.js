const THIS_GENRE = "Rock", PREFIX = "rock";
let startTime, elapsedTime = 0, timerInterval;

const display = document.getElementById('timerDisplay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const endBtn = document.getElementById('endBtn');
const musicEngine = document.getElementById('music-engine');

// --- MUSIC ENGINE LOGIC ---
function playTrack(trackId, btnElement) {
    const scUrl = `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${trackId}&color=%23e52d27&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`;
    
    musicEngine.innerHTML = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="${scUrl}"></iframe>`;
    
    document.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
    btnElement.closest('.song-item').classList.add('active');
}

function stopMusic() {
    musicEngine.innerHTML = ""; // Removes the iframe, stopping the sound
    document.querySelectorAll('.song-item').forEach(item => item.classList.remove('active'));
    console.log("Music stopped.");
}

document.querySelectorAll('.play-btn').forEach(button => {
    button.onclick = (e) => {
        const trackId = button.getAttribute('data-sc-id');
        playTrack(trackId, button);
    };
});

// --- TIMER & SESSION LOGIC ---
window.onload = function() {
    const savedTime = localStorage.getItem(PREFIX + 'ElapsedTime');
    if (savedTime) {
        elapsedTime = parseInt(savedTime);
        if (localStorage.getItem(PREFIX + 'TimerRunning') === 'true') {
            const lastTimestamp = parseInt(localStorage.getItem(PREFIX + 'LastTimestamp') || Date.now());
            elapsedTime += (Date.now() - lastTimestamp);
            startTimer();
        } else { updateDisplay(); }
    }
};

function updateDisplay() {
    let h = Math.floor(elapsedTime / 3600000), 
        m = Math.floor((elapsedTime % 3600000) / 60000), 
        s = Math.floor((elapsedTime % 60000) / 1000);
    display.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function startTimer() {
    startTime = Date.now() - elapsedTime;
    timerInterval = setInterval(() => {
        elapsedTime = Date.now() - startTime;
        updateDisplay();
        localStorage.setItem(PREFIX + 'ElapsedTime', elapsedTime);
        localStorage.setItem(PREFIX + 'LastTimestamp', Date.now());
    }, 1000);
    localStorage.setItem(PREFIX + 'TimerRunning', 'true');
    localStorage.setItem('activeGenre', THIS_GENRE);
    if(startBtn) startBtn.style.display = 'none'; 
    if(pauseBtn) pauseBtn.style.display = 'inline-block';
}

async function endSession() {
    clearInterval(timerInterval);
    stopMusic(); // STOP MUSIC ON END
    if (elapsedTime > 5000) {
        await saveAndCloseSession(THIS_GENRE, elapsedTime, display.textContent);
    }
    localStorage.setItem(PREFIX + 'TimerRunning', 'false');
    localStorage.removeItem(PREFIX + 'ElapsedTime');
    localStorage.removeItem(PREFIX + 'LastTimestamp');
    localStorage.removeItem('activeGenre');
    window.location.href = 'dashboard/dashboard.html';
}

if(startBtn) startBtn.onclick = startTimer;

if(pauseBtn) pauseBtn.onclick = () => { 
    clearInterval(timerInterval); 
    stopMusic(); // STOP MUSIC ON PAUSE
    localStorage.setItem(PREFIX + 'TimerRunning', 'false'); 
    if(startBtn) startBtn.style.display = 'inline-block'; 
    if(pauseBtn) pauseBtn.style.display = 'none'; 
};

if(endBtn) endBtn.onclick = endSession;