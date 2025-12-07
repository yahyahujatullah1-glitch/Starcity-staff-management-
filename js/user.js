import { supabase } from './config.js';
import { showModal, closeModal, formatDate } from './utils.js';

let currentUser = null;

export function initUserView(user) {
    currentUser = user;
    renderUserLayout();
}

function renderUserLayout() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="layout">
            <aside class="sidebar">
                <div class="sidebar-header">USER PANEL</div>
                <nav class="nav">
                    <button class="nav-btn active" onclick="window.loadView('tasks')"><i data-lucide="clipboard-list"></i> My Tasks</button>
                    <button class="nav-btn" onclick="window.loadView('chat')"><i data-lucide="message-square"></i> Team Chat</button>
                </nav>
                <div style="padding: 20px;">
                    <button id="logout-btn" class="btn btn-danger" style="width:100%">Logout</button>
                </div>
            </aside>
            <main id="user-content" class="content"></main>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('logout-btn').onclick = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    // Default view
    loadUserTasks();
    
    // Switcher Logic
    window.loadView = (view) => {
        if(view === 'tasks') loadUserTasks();
        if(view === 'chat') loadChat();
        
        // Update Active Button
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    };
}

// --- 1. MY TASKS & PROOF ---
async function loadUserTasks() {
    const container = document.getElementById('user-content');
    container.innerHTML = `<h2>My Assignments</h2><div id="task-list" style="margin-top:20px;">Loading...</div>`;

    const { data: tasks } = await supabase.from('tasks').select('*').eq('assigned_to', currentUser.id).order('created_at', {ascending:false});

    const list = document.getElementById('task-list');
    
    if(!tasks.length) {
        list.innerHTML = `<p style="color:gray">No tasks assigned to you yet.</p>`;
        return;
    }

    list.innerHTML = tasks.map(t => {
        let statusBadge = `<span style="color:gray">Pending</span>`;
        let actionBtn = `<button class="btn btn-primary" onclick="window.openSubmitProof(${t.id})">Submit Proof</button>`;
        
        if(t.status === 'submitted') {
            statusBadge = `<span style="color:#eab308">Under Review</span>`;
            actionBtn = `<span style="color:gray">Waiting for Admin...</span>`;
        } else if (t.status === 'approved') {
            statusBadge = `<span style="color:#22c55e">✅ Completed</span>`;
            actionBtn = ``;
        } else if (t.status === 'rejected') {
            statusBadge = `<span style="color:#ef4444">❌ Rejected</span>`;
            actionBtn = `<button class="btn btn-primary" onclick="window.openSubmitProof(${t.id})">Resubmit</button>`;
        }

        return `
        <div class="task-card status-${t.status}">
            <div style="display:flex; justify-content:space-between;">
                <h3>${t.title}</h3>
                <div>${statusBadge}</div>
            </div>
            <p style="color:#a1a1aa; margin:5px 0;">${t.feedback ? `<b>Admin Feedback:</b> ${t.feedback}` : ''}</p>
            <div style="margin-top:10px;">${actionBtn}</div>
        </div>`;
    }).join('');
}

window.openSubmitProof = (taskId) => {
    showModal('Submit Task Proof', `
        <label>Proof URL (Image/Doc Link)</label>
        <input id="proof-url" placeholder="https://imgur.com/...">
        <label>Notes</label>
        <textarea id="proof-notes" placeholder="Optional comments..."></textarea>
        <button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="window.submitTask(${taskId})">Submit for Approval</button>
    `);
};

window.submitTask = async (taskId) => {
    const proof = document.getElementById('proof-url').value;
    if(!proof) return alert("Proof Link is required!");

    await supabase.from('tasks').update({ 
        status: 'submitted', 
        proof_content: proof 
    }).eq('id', taskId);

    closeModal();
    loadUserTasks();
};

// --- 2. GLOBAL CHAT ---
async function loadChat() {
    const container = document.getElementById('user-content');
    container.innerHTML = `
        <div class="chat-container">
            <div id="chat-box" class="chat-messages">Loading messages...</div>
            <div class="chat-input-area">
                <input id="msg-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter') window.sendMessage()">
                <button class="btn btn-primary" onclick="window.sendMessage()">Send</button>
            </div>
        </div>
    `;

    // Fetch History
    const { data: msgs } = await supabase.from('messages').select('*, profiles(full_name)').order('created_at', {ascending: true}).limit(50);
    renderMessages(msgs);
    scrollToBottom();

    // Realtime Subscription
    supabase.channel('chat_room')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        // Fetch user name for the new message
        const { data: user } = await supabase.from('profiles').select('full_name').eq('id', payload.new.user_id).single();
        payload.new.profiles = user;
        renderMessages([payload.new], true);
        scrollToBottom();
    })
    .subscribe();
}

function renderMessages(msgs, append = false) {
    const box = document.getElementById('chat-box');
    if(!append) box.innerHTML = '';

    const html = msgs.map(m => `
        <div class="message ${m.user_id === currentUser.id ? 'msg-mine' : 'msg-others'}">
            <div style="font-size:0.7rem; opacity:0.7; margin-bottom:2px;">${m.profiles?.full_name || 'Unknown'}</div>
            ${m.content}
        </div>
    `).join('');

    box.insertAdjacentHTML('beforeend', html);
}

window.sendMessage = async () => {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if(!text) return;

    await supabase.from('messages').insert({ content: text, user_id: currentUser.id });
    input.value = '';
};

function scrollToBottom() {
    const box = document.getElementById('chat-box');
    if(box) box.scrollTop = box.scrollHeight;
}
