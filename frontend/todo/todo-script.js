// --- 0. SUPABASE CONFIG ---
const SB_URL = 'https://trafswsijeyryikiopht.supabase.co'; 
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYWZzd3NpamV5cnlpa2lvcGh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQwMTksImV4cCI6MjA4NDA0MDAxOX0.ScXfZe1P7bNIL8YYLE_JRLZPuoq48U7lVnkrGfGiE6Q';
const supabaseClient = supabase.createClient(SB_URL, SB_KEY);

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const activeList = document.getElementById('activeList');
const reportArchive = document.getElementById('reportArchive');
const totalWinsDisplay = document.getElementById('totalWins');
const clockElement = document.getElementById('liveClock');

// --- 1. STICKY NOTES LOGIC ---
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
    await supabaseClient.from('sticky_notes').upsert(
        { note_id: id, content: text, user_id: user.id }, 
        { onConflict: 'note_id, user_id' } 
    );
}

note1.oninput = () => saveNoteContent(1, note1.value);
note2.oninput = () => saveNoteContent(2, note2.value);

async function changeNoteColor(noteNum, color) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;
    const box = noteNum === 1 ? noteBox1 : noteBox2;
    box.style.background = color;
    await supabaseClient.from('sticky_notes').upsert(
        { note_id: noteNum, bg_color: color, user_id: user.id }, 
        { onConflict: 'note_id, user_id' }
    );
}

// --- 2. STATS & PROGRESS ---
let totalWinsCount = parseInt(localStorage.getItem('totalWins')) || 0;
totalWinsDisplay.innerText = totalWinsCount;

function updateProgressBar() {
    const activeTasks = document.querySelectorAll('#activeList li').length;
    const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayGroup = document.getElementById(todayStr);
    const doneTasks = todayGroup ? todayGroup.querySelectorAll('.report-item').length : 0;
    
    const totalToday = activeTasks + doneTasks;
    const percentage = totalToday === 0 ? 0 : Math.round((doneTasks / totalToday) * 100);
    
    document.getElementById('progressBarFill').style.width = percentage + "%";
    document.getElementById('progressText').innerText = percentage + "%";

    if (percentage === 100 && totalToday > 0) {
        clockElement.classList.add('all-done');
    } else {
        clockElement.classList.remove('all-done');
    }
}

// --- 3. TASKS (LOADS BOTH ACTIVE & COMPLETED) ---
async function loadTasks() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Fetch Active
    const { data: active } = await supabaseClient.from('tasks')
        .select('*')
        .eq('user_id', user.id) 
        .eq('is_completed', false)
        .order('created_at', { ascending: true });

    // Fetch Completed (History)
    const { data: completed } = await supabaseClient.from('tasks')
        .select('*')
        .eq('user_id', user.id) 
        .eq('is_completed', true)
        .order('created_at', { ascending: false });

    if (active) {
        activeList.innerHTML = '';
        active.forEach(task => addTaskToUI(task.task_text, task.id));
    }

    if (completed) {
        reportArchive.innerHTML = '';
        completed.forEach(task => {
            const dateStr = new Date(task.created_at).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            addCompletedTaskToUI(task.task_text, dateStr, timeStr);
        });
    }
    updateProgressBar();
}

addBtn.onclick = async () => {
    const text = todoInput.value.trim();
    if (text === "") return;
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    const { data, error } = await supabaseClient.from('tasks').insert([
        { task_text: text, is_completed: false, user_id: user.id }
    ]).select();

    if (!error && data) {
        addTaskToUI(data[0].task_text, data[0].id);
        todoInput.value = "";
        updateProgressBar();
    }
};

function addTaskToUI(text, id) {
    const li = document.createElement('li');
    li.dataset.id = id;
    li.innerHTML = `<span>${text}</span><button class="check-btn" onclick="completeTask(this)">Done</button>`;
    activeList.appendChild(li);
}

async function completeTask(btn) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const taskLi = btn.parentElement;
    const taskId = taskLi.dataset.id;
    const taskText = taskLi.querySelector('span').innerText;

    const { error } = await supabaseClient.from('tasks')
        .update({ is_completed: true })
        .eq('id', taskId)
        .eq('user_id', user.id); 

    if (!error) {
        const now = new Date();
        const dateString = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        addCompletedTaskToUI(taskText, dateString, timeString);
        taskLi.remove();

        totalWinsCount++;
        localStorage.setItem('totalWins', totalWinsCount);
        totalWinsDisplay.innerText = totalWinsCount;
        updateProgressBar();
    }
}

// Separate UI helper for the Accomplishment Report
function addCompletedTaskToUI(text, dateStr, timeStr) {
    let dateGroup = document.getElementById(dateStr);
    if (!dateGroup) {
        dateGroup = document.createElement('div');
        dateGroup.id = dateStr;
        dateGroup.innerHTML = `<div class="date-header">${dateStr}</div><div class="items-container"></div>`;
        reportArchive.prepend(dateGroup);
    }

    const item = document.createElement('div');
    item.className = 'report-item';
    item.innerHTML = `<span>${text}</span><span class="report-time">${timeStr}</span>`;
    dateGroup.querySelector('.items-container').appendChild(item);
}

async function clearReport() { 
    if (confirm("Clear history? This will remove all records from the database.")) { 
        const { data: { user } } = await supabaseClient.auth.getUser();
        const { error } = await supabaseClient.from('tasks').delete().eq('user_id', user.id).eq('is_completed', true);
        
        if (!error) {
            reportArchive.innerHTML = ""; 
            updateProgressBar(); 
        }
    } 
}

todoInput.onkeypress = (e) => { if (e.key === "Enter") addBtn.click(); };

// --- 4. CLOCK ---
function updateClock() {
    const now = new Date();
    clockElement.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}
setInterval(updateClock, 1000);
updateClock(); 

window.onload = () => { loadTasks(); loadNotes(); };