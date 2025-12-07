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
    
    app.innerHTML = `
        <div class="layout">
            <!-- Mobile Toggle Button is in index.html, logic in main.js -->
            
            <aside class="sidebar">
                <div class="sidebar-header">
                    <i data-lucide="shield" style="color:#3b82f6"></i>
                    <span>STARCITY</span>
                </div>
                <nav class="nav">
                    <button class="nav-btn active" onclick="window.loadView('tasks', this)">
                        <i data-lucide="clipboard-list"></i> My Assignments
                    </button>
                    <button class="nav-btn" onclick="window.loadView('chat', this)">
                        <i data-lucide="message-square"></i> Team Chat
                    </button>
                </nav>
                <div style="padding: 20px; margin-top: auto;">
                    <div style="font-size:0.8rem; color:gray; margin-bottom:10px;">
                        Logged in as: <br> <b style="color:white">${currentUser.email}</b>
                    </div>
                    <button id="logout-btn" class="btn btn-danger" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i data-lucide="log-out" style="width:16px;"></i> Logout
                    </button>
                </div>
            </aside>
            <main id="user-content" class="content"></main>
        </div>
    `;
    lucide.createIcons();
    
    // Logout Logic
    document.getElementById('logout-btn').onclick = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    // Default View
    loadUserTasks();
    
    // View Switcher
    window.loadView = (view, btnElement) => {
        // Sidebar Active State
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        
        // Close mobile sidebar if open
        const sidebar = document.querySelector('.sidebar');
        if(sidebar.classList.contains('open')) sidebar.classList.remove('open');

        if(view === 'tasks') loadUserTasks();
        if(view === 'chat') loadChat();
    };
}

// ==========================================
// 1. MY TASKS SYSTEM
// ==========================================
async function loadUserTasks() {
    const container = document.getElementById('user-content');
    container.innerHTML = `
        <h2>My Assignments</h2>
        <div id="task-list" style="margin-top:20px;">
            <div style="text-align:center; padding:40px; color:gray;">Loading tasks...</div>
        </div>
    `;

    const { data: tasks } = await supabase.from('tasks').select('*').eq('assigned_to', currentUser.id).order('created_at', {ascending:false});

    const list = document.getElementById('task-list');
    
    if(!tasks || tasks.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:50px; border:1px dashed #3f3f46; border-radius:10px;">
                <i data-lucide="check-circle" style="width:48px; height:48px; color:#22c55e; margin-bottom:10px;"></i>
                <p style="color:gray;">You have no active tasks.</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    list.innerHTML = tasks.map(t => {
        let statusBadge = `<span style="color:gray; font-size:0.9rem;">⏳ Pending</span>`;
        let actionBtn = `<button class="btn btn-primary" onclick="window.openSubmitProof(${t.id})">Submit Proof</button>`;
        let cardClass = 'status-pending';

        if(t.status === 'submitted') {
            statusBadge = `<span style="color:#eab308; font-size:0.9rem;">🕒 Under Review</span>`;
            actionBtn = `<button class="btn" style="background:#27272a; cursor:default; color:gray;">Waiting for Admin</button>`;
            cardClass = 'status-submitted';
        } else if (t.status === 'approved') {
            statusBadge = `<span style="color:#22c55e; font-size:0.9rem;">✅ Completed</span>`;
            actionBtn = ``; // No button needed
            cardClass = 'status-approved';
        } else if (t.status === 'rejected') {
            statusBadge = `<span style="color:#ef4444; font-size:0.9rem;">❌ Rejected</span>`;
            actionBtn = `<button class="btn btn-primary" onclick="window.openSubmitProof(${t.id})">Resubmit Proof</button>`;
            cardClass = 'status-rejected';
        }

        return `
        <div class="task-card ${cardClass}">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                <h3 style="font-size:1.1rem; margin:0;">${t.title}</h3>
                <div>${statusBadge}</div>
            </div>
            
            ${t.feedback ? `<div style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; padding:10px; border-radius:6px; margin-bottom:15px; font-size:0.9rem;">
                <b style="color:#ef4444;">Admin Feedback:</b> ${t.feedback}
            </div>` : ''}

            <div style="margin-top:10px;">${actionBtn}</div>
            
            <div style="margin-top:15px; font-size:0.75rem; color:#52525b; text-align:right;">
                Assigned: ${new Date(t.created_at).toLocaleDateString()}
            </div>
        </div>`;
    }).join('');
    
    lucide.createIcons();
}

// Modal: Submit Proof
window.openSubmitProof = (taskId) => {
    showModal('Submit Task Proof', `
        <p style="color:gray; font-size:0.9rem; margin-bottom:15px;">Paste a link to your work (Google Drive, Imgur, Doc link) or describe what you did.</p>
        
        <label>Proof Link / Description</label>
        <textarea id="proof-text" rows="3" placeholder="https://..." style="resize:none;"></textarea>
        
        <button class="btn btn-primary" style="width:100%; margin-top:15px;" onclick="window.submitTask(${taskId})">
            Submit for Approval
        </button>
    `);
};

// Action: Submit to DB
window.submitTask = async (taskId) => {
    const proof = document.getElementById('proof-text').value;
    if(!proof) return alert("Proof cannot be empty!");

    const btn = document.querySelector('.modal-box .btn-primary');
    btn.innerText = "Submitting...";
    btn.disabled = true;

    await supabase.from('tasks').update({ 
        status: 'submitted', 
        proof_content: proof 
    }).eq('id', taskId);

    closeModal();
    loadUserTasks(); // Refresh list
};

// ==========================================
// 2. TEAM CHAT SYSTEM (Realtime)
// ==========================================
async function loadChat() {
    const container = document.getElementById('user-content');
    
    // Inject Chat UI
    container.innerHTML = `
        <div class="chat-wrapper">
            <div class="chat-header" style="padding:15px; border-bottom:1px solid #3f3f46; background:#18181b;">
                <h3 style="font-size:1rem; margin:0;">💬 Team Communication</h3>
            </div>
            <div id="chat-box" class="chat-messages">
                <div style="text-align:center; padding:20px;"><div class="spinner"></div></div>
            </div>
            <div class="chat-input-area">
                <input id="msg-input" type="text" placeholder="Type a message..." autocomplete="off">
                <button class="send-btn" onclick="window.sendMessage()">
                    <i data-lucide="send" style="width:18px; height:18px;"></i>
                </button>
            </div>
        </div>
    `;
    lucide.createIcons();

    // Auto-focus input
    const input = document.getElementById('msg-input');
    // input.focus(); // Optional: Focus automatically on desktop

    // Enter Key Listener
    input.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') window.sendMessage();
    });

    // 1. Fetch History (Last 50 messages)
    const { data: msgs } = await supabase
        .from('messages')
        .select('*, profiles(full_name)')
        .order('created_at', {ascending: true})
        .limit(50);

    renderMessages(msgs || []);
    scrollToBottom();

    // 2. Realtime Listener
    const channel = supabase.channel('chat_room')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        // We need to fetch the sender's name separately since realtime payload doesn't include joined tables
        const { data: user } = await supabase.from('profiles').select('full_name').eq('id', payload.new.user_id).single();
        payload.new.profiles = user;
        
        renderMessages([payload.new], true);
        scrollToBottom();
    })
    .subscribe();
}

// Render Messages Helper
function renderMessages(msgs, append = false) {
    const box = document.getElementById('chat-box');
    if(!append) box.innerHTML = ''; // Clear loader if initial load

    const html = msgs.map(m => `
        <div class="message ${m.user_id === currentUser.id ? 'msg-mine' : 'msg-others'}">
            <div class="msg-user">${m.profiles?.full_name || 'Unknown'}</div>
            ${escapeHtml(m.content)}
        </div>
    `).join('');

    box.insertAdjacentHTML('beforeend', html);
}

// Send Message Action
window.sendMessage = async () => {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if(!text) return;

    // Optimistic UI (Clear input immediately)
    input.value = '';
    input.focus();

    await supabase.from('messages').insert({ 
        content: text, 
        user_id: currentUser.id 
    });
};

// Utils
function scrollToBottom() {
    const box = document.getElementById('chat-box');
    if(box) box.scrollTop = box.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
