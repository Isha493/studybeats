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
    setupRealtimeChat();
    listenForIncomingRequests(user.id);
    listenForFriendshipChanges(user.id);
}

// --- 1. SEARCH & REQUESTS ---
document.getElementById('addFriendBtn').onclick = async () => {
    const btn = document.getElementById('addFriendBtn');
    const query = document.getElementById('buddySearch').value.trim();
    
    if (query.length < 3) {
        addTerminalMsg("ERR: Search query too short.");
        return;
    }

    btn.textContent = "SEARCHING...";
    const { data: foundUsers } = await _supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${query}%`)
        .limit(1);

    if (!foundUsers || foundUsers.length === 0) {
        addTerminalMsg(`[SYSTEM]: User "${query}" not found.`);
    } else {
        await sendFriendRequest(foundUsers[0].id, foundUsers[0].username);
    }
    btn.textContent = "ADD_BUDDY";
};

async function sendFriendRequest(targetId, targetName) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (targetId === user.id) return addTerminalMsg("ERR: Self-link blocked.");

    const { error } = await _supabase
        .from('friendships')
        .insert([{ user_id: user.id, friend_id: targetId, status: 'pending' }]);

    if (error) addTerminalMsg("ERR: Link already exists or pending.");
    else addTerminalMsg(`[UPLINK]: Request sent to ${targetName}.`);
}

// --- 2. REALTIME LISTENERS ---
function listenForIncomingRequests(myId) {
    _supabase
        .channel('requests')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friendships', filter: `friend_id=eq.${myId}` }, 
        async (payload) => {
            const { data: sender } = await _supabase.from('profiles').select('username').eq('id', payload.new.user_id).single();
            const name = sender ? sender.username : "Unknown";
            
            const div = document.createElement('div');
            div.className = 'msg system-msg';
            div.innerHTML = `> [INCOMING]: ${name} wants to link. <button class="terminal-btn" onclick="acceptFriend('${payload.new.id}', '${name}')">ACCEPT</button>`;
            chatMessages.appendChild(div);
        }).subscribe();
}

function listenForFriendshipChanges(myId) {
    _supabase
        .channel('sync')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships' }, 
        (payload) => {
            if (payload.new.status === 'accepted') {
                console.log("Sync detected! Refreshing list...");
                loadFriends(myId);
            }
        }).subscribe();
}

// --- 3. THE FIX: ACCEPT & FORCE REFRESH ---
window.acceptFriend = async (requestId, senderName) => {
    const { error } = await _supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', requestId);

    if (error) {
        addTerminalMsg("ERR: Failed to sync.");
    } else {
        addTerminalMsg(`[SYSTEM]: Uplink with ${senderName} established.`);
        const { data: { user } } = await _supabase.auth.getUser();
        
        // Manual backup refresh
        setTimeout(() => loadFriends(user.id), 800);
    }
};

// --- 4. DATA LOADING ---
async function loadFriends(userId) {
    console.log("Fetching active uplinks...");
    const { data: relations } = await _supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq('status', 'accepted');

    if (!relations || relations.length === 0) {
        onlineCount.textContent = "0";
        document.getElementById('liveBuddiesList').innerHTML = `<p style="padding:20px; color:#666;">> NO ACTIVE UPLINKS...</p>`;
        return;
    }

    const ids = relations.map(r => r.user_id === userId ? r.friend_id : r.user_id);
    const { data: profiles } = await _supabase.from('profiles').select('id, username').in('id', ids);

    if (profiles) {
        onlineCount.textContent = profiles.length;
        document.getElementById('liveBuddiesList').innerHTML = profiles.map(p => `
            <div class="buddy-tile">
                <div class="tile-header">
                    <div class="user-meta">
                        <div class="mini-avatar">${p.username.substring(0,2).toUpperCase()}</div>
                        <h4>${p.username}</h4>
                    </div>
                    <div class="live-tag">CONNECTED</div>
                </div>
            </div>
        `).join('');
    }
}

// --- 5. CHAT ---
function setupRealtimeChat() {
    _supabase.channel('chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, 
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