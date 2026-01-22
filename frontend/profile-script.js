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

        // 2. Load Session Stats
        const { data: sessionData, error } = await _supabase
            .from('study_sessions')
            .select('duration, seconds_total, created_at')
            .eq('user_id', user.id);

        if (error) throw error;

        if (sessionData && sessionData.length > 0) {
            // FIX: Using Number() to ensure math works even if DB sends strings
            let totalSeconds = sessionData.reduce((acc, s) => {
                const val = s.duration || s.seconds_total || 0;
                return acc + Number(val); 
            }, 0);

            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            document.getElementById('totalTime').textContent = `${hours}h ${minutes}m`;
            
            // STREAK CALCULATION
            const dates = sessionData.map(s => new Date(s.created_at).toDateString());
            const uniqueDates = [...new Set(dates)].map(d => new Date(d));
            uniqueDates.sort((a, b) => b - a);

            let streak = 0;
            let today = new Date().toDateString();
            let lastDate = uniqueDates[0] ? uniqueDates[0].toDateString() : null;

            const dayDiff = lastDate ? Math.floor((new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24)) : 99;
            
            if (dayDiff <= 1) {
                streak = 1;
                for (let i = 0; i < uniqueDates.length - 1; i++) {
                    const diff = Math.floor((uniqueDates[i] - uniqueDates[i+1]) / (1000 * 60 * 60 * 24));
                    if (diff === 1) streak++;
                    else break;
                }
            }
            document.getElementById('streakCount').textContent = streak;
        } else {
            document.getElementById('totalTime').textContent = "0h 0m";
            document.getElementById('streakCount').textContent = "0";
        }

        renderHeatmap();

    } catch (err) {
        console.error("Profile Load Error:", err.message);
    }
}

async function renderHeatmap() {
    const grid = document.getElementById('heatmapGrid');
    const totalText = document.getElementById('totalTasksText');
    const { data: tasks, error } = await _supabase.from('tasks').select('created_at').eq('is_completed', true);
    if (error) return;
    const counts = {};
    tasks.forEach(task => {
        const date = new Date(task.created_at).toISOString().split('T')[0];
        counts[date] = (counts[date] || 0) + 1;
    });
    const today = new Date();
    let html = '';
    for (let i = 119; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = counts[dateStr] || 0;
        let level = 0;
        if (count > 0 && count <= 2) level = 1;
        else if (count > 2 && count <= 4) level = 2;
        else if (count > 4 && count <= 6) level = 3;
        else if (count > 6) level = 4;
        html += `<div class="square level-${level}" title="${dateStr}: ${count} completed"></div>`;
    }
    grid.innerHTML = html;
    totalText.textContent = `${tasks.length} tasks completed in the last 4 months`;
}

async function saveProfile() {
    const saveBtn = document.getElementById('saveBtn');
    const newName = document.getElementById('newUsernameInput').value.trim();
    const imageInput = document.getElementById('imageInput');
    const imageFile = imageInput.files[0];
    if (!newName && !imageFile) return alert("Enter a name or select an image.");
    
    saveBtn.disabled = true;
    saveBtn.textContent = "Updating...";
    
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        let updateData = {};
        if (newName) updateData.username = newName;
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${fileExt}`;
            let { error: uploadError } = await _supabase.storage.from('avator').upload(fileName, imageFile);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = _supabase.storage.from('avator').getPublicUrl(fileName);
            updateData.avatar_url = publicUrl;
        }
        await _supabase.auth.updateUser({ data: updateData });
        alert("Profile updated!");
        location.reload();
    } catch (err) {
        alert("Update failed: " + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Changes";
    }
}

function openEditModal() { document.getElementById('editModal').style.display = 'flex'; }
function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('liveClock');
    const dateEl = document.getElementById('currentDate');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

async function handleLogout() {
    if (window._supabase) {
        await _supabase.auth.signOut();
        window.location.href = 'login.html';
    }
}

window.onload = () => {
    updateClock();
    setInterval(updateClock, 1000);
    loadProfile();
};