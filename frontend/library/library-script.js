let seconds = 0;
let currentMusicList = []; 

window.addEventListener('DOMContentLoaded', () => {
    initTimer();
    loadItems();
    updateClock();
    setInterval(updateClock, 1000);
});

function initTimer() {
    const timerEl = document.getElementById('cornerTimer');
    if (timerEl) {
        setInterval(() => {
            seconds++;
            let m = Math.floor(seconds / 60);
            let s = seconds % 60;
            timerEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }, 1000);
    }
}

// ... existing timer and loadItems logic remains the same ...

function playSongFromLibrary(index) {
    const song = currentMusicList[index];
    if (!song) return;

    const payload = {
        type: 'PLAY_TRACK',
        url: song.url,
        name: song.name,
        playlist: currentMusicList,
        index: index
    };

    // This sends the song to the Parent (app.html)
    if (window.parent !== window) {
        window.parent.postMessage(payload, '*');
    } else {
        console.error("Master shell not found. Open app.html instead of library.html");
    }
}

// ... the rest of your uploadFile and deleteItem functions ...

function updateClock() {
    const clockEl = document.getElementById('liveClock');
    if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }
}

async function uploadFile(bucket, input) {
    const file = input.files[0];
    if (!file) return;
    const label = input.parentElement;
    const originalHTML = label.innerHTML;
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        label.style.pointerEvents = "none";
        label.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading...`;
        const { error } = await _supabase.storage.from(bucket).upload(filePath, file);
        if (error) throw error;
        await loadItems();
        alert("Upload successful!");
    } catch (err) {
        console.error("Upload Error:", err);
        alert("Upload failed: " + err.message);
    } finally {
        label.innerHTML = originalHTML;
        label.style.pointerEvents = "auto";
    }
}

async function loadItems() {
    if (!window._supabase) {
        setTimeout(loadItems, 500);
        return;
    }
    try {
        const { data: { user } } = await _supabase.auth.getUser();
        if (!user) return;
        const { data: musicFiles } = await _supabase.storage.from('user-music').list(user.id);
        if (musicFiles) renderGrid('musicGrid', musicFiles, 'user-music', user.id, 'fa-play-circle');
        const { data: studyFiles } = await _supabase.storage.from('study-materials').list(user.id);
        if (studyFiles) renderGrid('studyGrid', studyFiles, 'study-materials', user.id, 'fa-file-pdf');
    } catch (err) { console.error("Load Error:", err); }
}

function renderGrid(elementId, files, bucket, userId, iconClass) {
    const grid = document.getElementById(elementId);
    if (!grid || !files) return;

    if (bucket === 'user-music') {
        currentMusicList = files.map(file => {
            const { data } = _supabase.storage.from('user-music').getPublicUrl(`${userId}/${file.name}`);
            const displayName = file.name.includes('-') ? file.name.split('-').slice(1).join('-') : file.name;
            return { url: data.publicUrl, name: displayName };
        });
    }

    grid.innerHTML = files.map((file, index) => {
        const displayName = file.name.includes('-') ? file.name.split('-').slice(1).join('-') : file.name;
        const filePath = `${userId}/${file.name}`;
        const clickAction = bucket === 'user-music' ? `playSongFromLibrary(${index})` : `openFile('${bucket}', '${filePath}')`;
        return `
            <div class="item-card" onclick="${clickAction}">
                <button class="delete-item-btn" onclick="event.stopPropagation(); deleteItem('${bucket}', '${filePath}')">
                    <i class="fas fa-times"></i>
                </button>
                <i class="fas ${iconClass}"></i>
                <p title="${displayName}">${displayName}</p>
            </div>`;
    }).join('');
}

function playSongFromLibrary(index) {
    const song = currentMusicList[index];
    if (!song) return;
    const payload = {
        type: 'PLAY_TRACK',
        url: song.url,
        name: song.name,
        playlist: currentMusicList,
        index: index
    };
    if (window.parent !== window) {
        window.parent.postMessage(payload, '*');
    } else {
        window.playlist = currentMusicList;
        window.currentIndex = index;
        if (typeof window.playTrack === "function") {
            window.playTrack(song.url, song.name);
        }
    }
}

async function openFile(bucket, path) {
    const { data } = _supabase.storage.from(bucket).getPublicUrl(path);
    window.open(data.publicUrl, '_blank');
}

async function deleteItem(bucket, path) {
    if (confirm("Remove this item?")) {
        await _supabase.storage.from(bucket).remove([path]);
        loadItems();
    }
}