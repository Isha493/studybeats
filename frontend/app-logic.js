window.addEventListener('DOMContentLoaded', () => {
    const trigger = document.getElementById('menuTrigger');
    const sidebar = document.getElementById('sidebar');

    // Desktop Hover Logic
    sidebar.addEventListener('mouseenter', () => {
        if(trigger) {
            trigger.style.opacity = '0';
            trigger.style.visibility = 'hidden';
        }
    });

    sidebar.addEventListener('mouseleave', () => {
        if(trigger && !sidebar.classList.contains('mobile-open')) {
            trigger.style.opacity = '1';
            trigger.style.visibility = 'visible';
        }
    });

    // Mobile Toggle Logic
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('mobile-open');
        trigger.style.opacity = sidebar.classList.contains('mobile-open') ? '0' : '1';
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            trigger.style.opacity = '1';
            trigger.style.visibility = 'visible';
        }
    });

    setupNavigationHighlighting();
});

function setupNavigationHighlighting() {
    const navItems = document.querySelectorAll('.nav-item');
    const sidebar = document.getElementById('sidebar');
    const trigger = document.getElementById('menuTrigger');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(i => i.classList.remove('active-nav'));
            this.classList.add('active-nav');
            
            // Auto-close sidebar on mobile
            sidebar.classList.remove('mobile-open');
            if(trigger) {
                trigger.style.opacity = '1';
                trigger.style.visibility = 'visible';
            }
            document.activeElement.blur(); 
        });
    });
}

window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PLAY_TRACK') {
        window.playlist = event.data.playlist || [];
        window.currentIndex = event.data.index || 0;
        if (typeof window.playTrack === "function") {
            window.playTrack(event.data.url, event.data.name);
        }
    }
});

async function handleLogout() {
    if(confirm("Are you sure you want to logout?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
}