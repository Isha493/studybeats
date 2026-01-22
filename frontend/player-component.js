window.globalAudio = window.globalAudio || new Audio();
window.isPlaying = false;
window.playlist = [];
window.currentIndex = 0;

window.updateUI = function(name) {
    const musicBlock = document.getElementById('musicBlock');
    const nowPlayingText = document.getElementById('nowPlaying');
    const playBtnIcon = document.getElementById('playBtnIcon');
    const discIcon = document.getElementById('discIcon');

    if (musicBlock) musicBlock.style.display = 'flex';
    if (nowPlayingText) nowPlayingText.innerText = name || "Playing...";
    if (playBtnIcon) playBtnIcon.className = window.isPlaying ? "fas fa-pause" : "fas fa-play";
    
    if (discIcon) {
        window.isPlaying ? discIcon.classList.add('fa-spin') : discIcon.classList.remove('fa-spin');
    }
};

window.playTrack = function(url, name) {
    if (!url) return;
    window.globalAudio.src = url;
    window.globalAudio.play().then(() => {
        window.isPlaying = true;
        window.updateUI(name);
    }).catch(err => {
        console.warn("Autoplay blocked. User must click once first.");
        window.updateUI(name);
    });
};

window.toggleGlobalPlay = function() {
    if (!window.globalAudio.src) return;
    if (window.isPlaying) {
        window.globalAudio.pause();
    } else {
        window.globalAudio.play();
    }
    window.isPlaying = !window.isPlaying;
    window.updateUI(window.playlist[window.currentIndex]?.name || "Selected Track");
};

window.nextTrack = function() {
    if (window.playlist.length > 0 && window.currentIndex < window.playlist.length - 1) {
        window.currentIndex++;
        const song = window.playlist[window.currentIndex];
        window.playTrack(song.url, song.name);
    }
};

window.prevTrack = function() {
    if (window.playlist.length > 0 && window.currentIndex > 0) {
        window.currentIndex--;
        const song = window.playlist[window.currentIndex];
        window.playTrack(song.url, song.name);
    }
};

window.closePlayer = function() {
    window.globalAudio.pause();
    window.isPlaying = false;
    const mb = document.getElementById('musicBlock');
    if (mb) mb.style.display = 'none';
};

// LISTEN FOR MESSAGES FROM LIBRARY IFRAME
window.addEventListener('message', (event) => {
    if (event.data.type === 'PLAY_TRACK') {
        window.playlist = event.data.playlist || [];
        window.currentIndex = event.data.index || 0;
        window.playTrack(event.data.url, event.data.name);
    }
});

window.globalAudio.onended = () => window.nextTrack();