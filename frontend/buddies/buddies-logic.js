// buddies-logic.js
const chatMessages = document.getElementById('chatMessages');
const onlineCount = document.getElementById('onlineCount');

async function initNetwork() {
    if (!window._supabase) {
        setTimeout(initNetwork, 500);
        return;
    }

    const { data: { user } } = await window._supabase.auth.getUser();
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    console.log("Network Hub Online for:", user.email);
    
    // Initial Load
    await loadFriends(user.id);
    await loadPendingRequests(user.id);
    setupRealtimeChat();
    listenForIncomingRequests(user.id);
    listenForFriendshipChanges(user.id);
}

// --- 1. DATA LOADING (Updated with deep logging) ---
async function loadFriends(userId) {
    console.log("--- SYNC START ---");
    try {
        const { data: relations, error } = await _supabase
            .from('friendships')
            .select('user_id, friend_id')
            .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
            .eq('status', 'accepted');

        if (error) throw error;

        console.log("Relations found in DB:", relations);

        if (!relations || relations.length === 0) {
            onlineCount.textContent = "0";
            document.getElementById('liveBuddiesList').innerHTML = `<p style="padding:20px; color:#666;">> NO ACTIVE UPLINKS...</p>`;
            return;
        }

        const ids = relations.map(r => r.user_id === userId ? r.friend_id : r.user_id);
        const { data: profiles, error: pError } = await _supabase.from('profiles').select('id, username').in('id', ids);

        if (pError) throw pError;

        if (profiles) {
            console.log("Profiles retrieved:", profiles);
            onlineCount.textContent = profiles.length;
            document.getElementById('liveBuddiesList').innerHTML = profiles.map(p => `
                <div class="buddy-tile">
                    <div class="tile-header">
                        <div class="user-meta">
                            <div class="mini-avatar">${(p.username || '??').substring(0,2).toUpperCase()}</div>
                            <h4>${p.username}</h4>
                        </div>
                        <div class="live-tag">CONNECTED</div>
                    </div>
                </div>
            `).join('');
            console.log("--- UI UPDATED SUCCESSFULLY ---");
        }
    } catch (err) {
        console.error("SYNC ERROR:", err.message);
    }
}

// --- 2. PENDING REQUESTS ---
async function loadPendingRequests(myId) {
    const { data: pending, error } = await _supabase
        .from('friendships')
        .select(`id, user_id`)
        .eq('friend_id', myId)
        .eq('status', 'pending');

    if (pending) {
        for (const req of pending) {
            const { data: profile } = await _supabase.from('profiles').select('username').eq('id', req.user_id).single();
            renderRequest(req.id, profile?.username || "Unknown");
        }
    }
}

function renderRequest(requestId, senderName) {
    if (document.getElementById(`req-${requestId}`)) return;
    const div = document.createElement('div');
    div.id = `req-${requestId}`;
    div.className = 'msg system-msg';
    div.innerHTML = `> [INCOMING]: ${senderName} wants to link. <button class="terminal-btn" onclick="acceptFriend('${requestId}', '${senderName}')">ACCEPT</button>`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// --- 3. REALTIME LISTENERS ---
function listenForIncomingRequests(myId) {
    _supabase.channel(`in-${myId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `friend_id=eq.${myId}` }, 
        async (payload) => {
            console.log("Realtime: New request!");
            const { data: sender } = await _supabase.from('profiles').select('username').eq('id', payload.new.user_id).single();
            renderRequest(payload.new.id, sender?.username || "Unknown");
        }).subscribe();
}

function listenForFriendshipChanges(myId) {
    _supabase.channel(`sync-${myId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships' }, 
        (payload) => {
            if (payload.new.status === 'accepted' && (payload.new.user_id === myId || payload.new.friend_id === myId)) {
                console.log("Realtime: Update detected, syncing list...");
                loadFriends(myId);
            }
        }).subscribe();
}

// --- 4. ACCEPT LOGIC ---
window.acceptFriend = async (requestId, senderName) => {
    console.log("Accepting request ID:", requestId);
    const { error } = await _supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

    if (error) {
        addTerminalMsg("ERR: Failed to sync.");
        console.error("Accept error:", error);
    } else {
        const reqEl = document.getElementById(`req-${requestId}`);
        if (reqEl) reqEl.remove();
        addTerminalMsg(`[SYSTEM]: Uplink with ${senderName} established.`);
        
        const { data: { user } } = await _supabase.auth.getUser();
        // FORCE REFRESH: Don't wait for Realtime
        await loadFriends(user.id);
    }
};

// --- 5. SEARCH & CHAT ---
document.getElementById('addFriendBtn').onclick = async () => {
    const query = document.getElementById('buddySearch').value.trim();
    if (query.length < 3) return addTerminalMsg("ERR: Name too short.");
    
    const { data: found } = await _supabase.from('profiles').select('id, username').ilike('username', `%${query}%`).limit(1);
    if (!found || found.length === 0) return addTerminalMsg(`[SYSTEM]: ${query} not found.`);
    
    const { data: { user } } = await _supabase.auth.getUser();
    const { error } = await _supabase.from('friendships').insert([{ user_id: user.id, friend_id: found[0].id, status: 'pending' }]);
    
    if (error) addTerminalMsg("ERR: Request already active.");
    else addTerminalMsg(`[UPLINK]: Sent to ${found[0].username}.`);
};

function setupRealtimeChat() {
    _supabase.channel('global_chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
    async (payload) => {
        const { data: p } = await _supabase.from('profiles').select('username').eq('id', payload.new.sender_id).single();
        addTerminalMsg(`[${(p?.username || 'SYSTEM').toUpperCase()}]: ${payload.new.content}`);
    }).subscribe();
}

document.getElementById('sendBtn').onclick = async () => {
    const input = document.getElementById('chatInput');
    if (!input.value.trim()) return;
    const { data: { user } } = await _supabase.auth.getUser();
    await _supabase.from('messages').insert([{ sender_id: user.id, content: input.value.trim() }]);
    input.value = '';
};

function addTerminalMsg(text) {
    const d = document.createElement('div');
    d.className = 'msg';
    d.textContent = `> ${text}`;
    chatMessages.appendChild(d);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

initNetwork();