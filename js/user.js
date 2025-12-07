import { supabase } from './config.js';
import { showModal, closeModal, formatDate } from './utils.js';

let currentUser = null;

// --- INIT ---
export function initUserView(user) {
    currentUser = user;
    renderUserLayout();
}

// --- LAYOUT ---
function renderUserLayout() {
    const app = document.getElementById('app');
    
    // Show mobile button again if hidden by login
    document.getElementById('mobile-menu-btn').style.display = 'block';

    app.innerHTML = `
        <div class="layout">
            <aside class="sidebar">
                <div class="sidebar-header">
                    <i data-lucide="shield" style="color:#3b82f6"></i> STARCITY
                </div>
                <nav class="nav">
                    <button class="nav-btn active" onclick="window.switchView('tasks', this)">
                        <i data-lucide="clipboard-list"></i> Assignments
                    </button>
                    <button class="nav-btn" onclick="window.switchView('chat', this)">
                        <i data-lucide="message-square"></i> Team Chat
                    </button>
                </nav>
                <div style="padding:20px; margin-top:auto;">
                    <button id="logout-btn" class="btn btn-danger" style="width:100%">Logout</button>
                </div>
            </aside>
            <main id="user-content" class="content"></main>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('logout-btn').onclick = async () => { await supabase.auth.signOut(); window.location.reload(); };

    // Default View
    loadUserTasks();

    window.switchView = (view, btn) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(btn) btn.classList.add('active');
        
        // Auto-close mobile menu
        document.querySelector('.sidebar').classList.remove('open');

        if(view === 'tasks') loadUserTasks();
        if(view === 'chat') loadChat();
    };
}

// --- CHAT SYSTEM ---
async function loadChat() {
    const container = document.getElementById('user-content');
    
    // 1. Setup Fixed Layout
    container.innerHTML = `
        <div class="chat-wrapper">
            <div class="chat-header">Team Communication</div>
            
            <div id="chat-box" class="chat-messages">
                <div style="text-align:center; padding:20px;"><div class="spinner"></div></div>
            </div>
            
            <div class="chat-input-area">
                <input id="msg-input" type="text" placeholder="Type a message..." autocomplete="off">
                <button class="send-btn" onclick="window.sendMessage()">
                    <i data-lucide="send" style="width:18px;"></i>
                </button>
            </div>
        </div>
    `;
    lucide.createIcons();

    // 2. Fetch Messages
    const { data: msgs } = await supabase.from('messages').select('*, profiles(full_name)').order('created_at', {ascending: true}).limit(50);
    renderMessages(msgs || []);
    scrollToBottom();

    // 3. Setup Input Listeners
    const input = document.getElementById('msg-input');
    input.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') window.sendMessage();
    });

    // 4. Realtime Listener
    supabase.channel('chat_room').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const { data: user } = await supabase.from('profiles').select('full_name').eq('id', payload.new.user_id).single();
        payload.new.profiles = user;
        renderMessages([payload.new], true);
        scrollToBottom();
    }).subscribe();
}

function renderMessages(msgs, append = false) {
    const box = document.getElementById('chat-box');
    if(!append) box.innerHTML = '';

    const html = msgs.map(m => `
        <div class="message ${m.user_id === currentUser.id ? 'msg-mine' : 'msg-others'}">
            <div class="msg-user">${m.profiles?.full_name || 'Unknown'}</div>
            ${escapeHtml(m.content)}
        </div>
    `).join('');

    box.insertAdjacentHTML('beforeend', html);
}

window.sendMessage = async () => {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if(!text) return;
    
    input.value = '';
    input.focus();
    await supabase.from('messages').insert({ content: text, user_id: currentUser.id });
};

// --- TASKS SYSTEM ---
async function loadUserTasks() {
    const container = document.getElementById('user-content');
    container.innerHTML = `<h2>My Tasks</h2><div id="task-list" style="margin-top:20px;">Loading...</div>`;
    
    const { data: tasks } = await supabase.from('tasks').select('*').eq('assigned_to', currentUser.id).order('created_at', {ascending:false});
    
    const list = document.getElementById('task-list');
    if(!tasks || tasks.length===0) return list.innerHTML = `<p style="color:gray;">No tasks assigned.</p>`;

    list.innerHTML = tasks.map(t => `
        <div class="task-card status-${t.status}" style="background:var(--bg-panel); padding:15px; border-radius:8px; border-left:4px solid gray; margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between;">
                <h3>${t.title}</h3>
                <span class="badge">${t.status.toUpperCase()}</span>
            </div>
            ${t.status === 'pending' || t.status === 'rejected' ? `<button class="btn btn-primary" style="margin-top:10px;" onclick="window.submitProof(${t.id})">Submit Proof</button>` : ''}
        </div>
    `).join('');
}

window.submitProof = (id) => {
    showModal('Submit Proof', `
        <label>Link to Proof</label><input id="proof-val">
        <button class="btn btn-primary" onclick="window.doSubmit(${id})">Send</button>
    `);
};
window.doSubmit = async (id) => {
    await supabase.from('tasks').update({ status:'submitted', proof_content: document.getElementById('proof-val').value }).eq('id', id);
    closeModal(); loadUserTasks();
};

function scrollToBottom() {
    const box = document.getElementById('chat-box');
    if(box) box.scrollTop = box.scrollHeight;
}
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
