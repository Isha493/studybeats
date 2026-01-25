const SB_URL = 'https://trafswsijeyryikiopht.supabase.co'; 
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYWZzd3NpamV5cnlpa2lvcGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQwMTksImV4cCI6MjA4NDA0MDAxOX0.ScXfZe1P7bNIL8YYLE_JRLZPuoq48U7lVnkrGfGiE6Q';
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const activeList = document.getElementById('activeList');
const reportArchive = document.getElementById('reportArchive');
const totalWinsDisplay = document.getElementById('totalWins');
const clockElement = document.getElementById('liveClock');

let timers = {}; 

const note1 = document.getElementById('stickyTextArea');
const note2 = document.getElementById('stickyTextArea2');
const noteBox1 = document.getElementById('stickyNote');
const noteBox2 = document.getElementById('stickyNote2');

async function loadNotes() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const { data } = await supabaseClient.from('sticky_notes').select('*').eq('user_id', user.id);
    if (data) {
        data.forEach(note => {
            if (note.note_id === 1) {
                note1.value = note.content || "";
                noteBox1.style.background = note.bg_color || "#f1c40f";
            } else if (note.note_id === 2) {
                note2.value = note.content || "";
                noteBox2.style.background = note.bg_color || "#ffb7c5";
            }
        });
    }
}

async function saveNoteContent(id, text) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    await supabaseClient.from('sticky_notes').upsert({ note_id: id, content: text, user_id: user.id }, { onConflict: 'note_id, user_id' });
}

note1.oninput = () => saveNoteContent(1, note1.value);
note2.oninput = () => saveNoteContent(2, note2.value);

async function changeNoteColor(noteNum, color) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const box = noteNum === 1 ? noteBox1 : noteBox2;
    box.style.background = color;
    await supabaseClient.from('sticky_notes').upsert({ note_id: noteNum, bg_color: color, user_id: user.id }, { onConflict: 'note_id, user_id' });
}

let totalWinsCount = parseInt(localStorage.getItem('totalWins')) || 0;
totalWinsDisplay.innerText = totalWinsCount;

function updateProgressBar() {
    const activeTasks = document.querySelectorAll('#activeList li').length;
    const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayGroup = document.getElementById(todayStr);
    const doneTasks = todayGroup ? todayGroup.querySelectorAll('.report-item:not(.dnf-item)').length : 0;
    const totalToday = activeTasks + doneTasks;
    const percentage = totalToday === 0 ? 0 : Math.round((doneTasks / totalToday) * 100);
    document.getElementById('progressBarFill').style.width = percentage + "%";
    document.getElementById('progressText').innerText = percentage + "%";
}

async function loadTasks() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const { data: active } = await supabaseClient.from('tasks').select('*').eq('user_id', user.id).eq('is_completed', false).order('created_at', { ascending: true });
    const { data: history } = await supabaseClient.from('tasks').select('*').eq('user_id', user.id).neq('is_completed', false).order('created_at', { ascending: false }).limit(20);
    if (active) {
        activeList.innerHTML = '';
        active.forEach(task => addTaskToUI(task.task_text, task.id));
    }
    if (history) {
        reportArchive.innerHTML = '';
        history.forEach(task => {
            const dateStr = new Date(task.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            addCompletedTaskToUI(task.task_text, dateStr, timeStr, task.is_completed);
        });
    }
    updateProgressBar();
}

function addTaskToUI(text, id) {
    if (!document.getElementById('listHeader')) {
        const h = document.createElement('div');
        h.id = 'listHeader';
        h.className = 'list-header';
        h.style.marginBottom = "15px"; 
        h.innerHTML = `<span>Task</span><span style="text-align:center">Timer</span><span style="text-align:right">Status</span>`;
        activeList.before(h);
    }
    const li = document.createElement('li');
    li.dataset.id = id;
    li.innerHTML = `
        <span class="task-name">${text}</span>
        <div class="task-timer-container" id="actions-${id}">
            <span class="task-timer" id="timer-${id}">00:00</span>
            <button class="action-icon play-icon" onclick="toggleTimer('${id}')">▶</button>
            <button class="action-icon stop-icon" onclick="toggleTimer('${id}')">⏹</button>
        </div>
        <div class="task-actions">
            <button class="action-icon done-icon" onclick="completeTask(this, true)">✓</button>
            <button class="action-icon fail-icon" onclick="completeTask(this, false)">✕</button>
        </div>
    `;
    activeList.appendChild(li);
}

function toggleTimer(id) {
    const group = document.getElementById(`actions-${id}`);
    const display = document.getElementById(`timer-${id}`);
    if (timers[id]) {
        clearInterval(timers[id].interval);
        saveTime(timers[id].seconds);
        delete timers[id];
        group.classList.remove('is-running');
    } else {
        group.classList.add('is-running');
        timers[id] = { seconds: 0, interval: setInterval(() => {
            timers[id].seconds++;
            const m = Math.floor(timers[id].seconds / 60).toString().padStart(2, '0');
            const s = (timers[id].seconds % 60).toString().padStart(2, '0');
            display.innerText = `${m}:${s}`;
        }, 1000)};
    }
}

async function saveTime(s) {
    if (s < 1) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    const userId = user ? user.id : null;
    const { error } = await supabaseClient.from('study_sessions').insert([{ user_id: userId, seconds_total: s }]);
    if (error) console.error("Error saving time:", error.message);
}

async function completeTask(btn, isDone) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const li = btn.closest('li');
    const id = li.dataset.id;
    const txt = li.querySelector('.task-name').innerText;
    if (timers[id]) toggleTimer(id);
    const { error } = await supabaseClient.from('tasks').update({ is_completed: isDone }).eq('id', id).eq('user_id', user.id);
    if (!error) {
        const now = new Date();
        addCompletedTaskToUI(txt, now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isDone);
        li.remove();
        if (isDone) {
            totalWinsCount++;
            localStorage.setItem('totalWins', totalWinsCount);
            totalWinsDisplay.innerText = totalWinsCount;
        }
        updateProgressBar();
    }
}

function addCompletedTaskToUI(text, dateStr, timeStr, isDone) {
    let group = document.getElementById(dateStr);
    if (!group) {
        group = document.createElement('div');
        group.id = dateStr;
        group.innerHTML = `<div class="date-header">${dateStr}</div><div class="items-container"></div>`;
        reportArchive.prepend(group);
    }
    const item = document.createElement('div');
    item.className = isDone ? 'report-item' : 'report-item dnf-item';
    item.innerHTML = `<span>${text} ${isDone ? '' : '(DNF)'}</span><span class="report-time">${timeStr}</span>`;
    group.querySelector('.items-container').appendChild(item);
}

addBtn.onclick = async () => {
    const text = todoInput.value.trim();
    if (!text) return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data, error } = await supabaseClient.from('tasks').insert([{ task_text: text, is_completed: false, user_id: user.id }]).select();
    if (!error && data) {
        addTaskToUI(data[0].task_text, data[0].id);
        todoInput.value = "";
        updateProgressBar();
    }
};

async function clearReport() { 
    if (confirm("Clear history?")) { 
        const { data: { user } } = await supabaseClient.auth.getUser();
        await supabaseClient.from('tasks').delete().eq('user_id', user.id).neq('is_completed', false);
        reportArchive.innerHTML = ""; 
        updateProgressBar(); 
    } 
}

todoInput.onkeypress = (e) => { if (e.key === "Enter") addBtn.click(); };
setInterval(() => { clockElement.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); }, 1000);
window.onload = () => { loadTasks(); loadNotes(); };