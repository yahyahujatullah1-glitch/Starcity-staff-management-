import { supabase } from './config.js';
import { showModal, closeModal, formatDate } from './utils.js';

let currentUser = null;

export function initUserView(user) {
    currentUser = user;
    renderUserLayout();
}

function renderUserLayout() {
    const app = document.getElementById('app');
    
    // Show mobile button again
    document.getElementById('mobile-menu-btn').style.display = 'block';

    app.innerHTML = `
        <div class="flex h-full w-full overflow-hidden">
            <!-- SIDEBAR -->
            <aside class="sidebar fixed inset-y-0 left-0 w-72 bg-panel border-r border-border transform -translate-x-full md:translate-x-0 z-40 flex flex-col transition-transform duration-300 h-full">
                <div class="p-6 border-b border-border flex items-center gap-3 shrink-0">
                    <div class="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary border border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        <i data-lucide="shield" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h2 class="font-heading font-bold text-xl text-white tracking-widest leading-none">STARCITY</h2>
                        <span class="text-xs text-primary font-bold tracking-widest">OPERATIVE UPLINK</span>
                    </div>
                </div>

                <nav class="nav-container flex-1 p-4 space-y-2 overflow-y-auto">
                    <button class="nav-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors active-nav" onclick="window.switchView('tasks', this)">
                        <i data-lucide="clipboard-list" class="w-5 h-5"></i> MY ASSIGNMENTS
                    </button>
                    <button class="nav-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onclick="window.switchView('chat', this)">
                        <i data-lucide="message-square" class="w-5 h-5"></i> SECURE COMMS
                    </button>
                </nav>

                <div class="p-4 border-t border-border bg-black/20 shrink-0">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                            ${currentUser.email[0].toUpperCase()}
                        </div>
                        <div class="overflow-hidden">
                            <p class="text-white text-sm font-bold truncate">${currentUser.email.split('@')[0]}</p>
                            <p class="text-gray-500 text-xs truncate">Operative</p>
                        </div>
                    </div>
                    <button id="logout-btn" class="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500 hover:text-white transition-all">
                        <i data-lucide="log-out" class="w-4 h-4"></i> DISCONNECT
                    </button>
                </div>
            </aside>

            <!-- MAIN CONTENT (Flex Column to ensure height fits) -->
            <main id="user-content" class="flex-1 md:ml-72 bg-dark h-full max-h-full flex flex-col overflow-hidden relative w-full"></main>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('logout-btn').onclick = async () => { await supabase.auth.signOut(); window.location.reload(); };
    
    // Default View
    loadUserTasks();

    window.switchView = (view, btn) => {
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('bg-primary/10', 'text-white', 'border-l-2', 'border-primary');
            b.classList.add('text-gray-400');
        });
        if(btn) {
            btn.classList.add('bg-primary/10', 'text-white', 'border-l-2', 'border-primary');
            btn.classList.remove('text-gray-400');
        }
        
        document.querySelector('.sidebar').classList.remove('open'); // Close mobile menu

        if(view === 'tasks') loadUserTasks();
        if(view === 'chat') loadChat();
    };
    
    // Set active style on first btn initially
    document.querySelector('.nav-btn').click();
}

// --- CHAT SYSTEM (FIXED FOR MOBILE) ---
async function loadChat() {
    const container = document.getElementById('user-content');
    container.innerHTML = `
        <div class="flex flex-col h-full w-full bg-dark overflow-hidden relative">
            
            <!-- 1. HEADER (Fixed Height) -->
            <div class="h-14 border-b border-border bg-panel flex items-center px-4 md:px-6 shadow-sm z-10 flex-shrink-0 justify-between md:justify-start">
                <div class="w-8 md:hidden"></div> <!-- Spacer for mobile menu button -->
                <h3 class="font-heading font-bold text-white text-lg tracking-wide flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    ENCRYPTED CHANNEL
                </h3>
            </div>
            
            <!-- 2. MESSAGES (Takes remaining space, scrolls internally) -->
            <div id="chat-box" class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth min-h-0 w-full">
                <div class="flex justify-center mt-10"><div class="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full"></div></div>
            </div>
            
            <!-- 3. INPUT AREA (Pinned to bottom, never shrinks) -->
            <div class="p-3 md:p-4 bg-panel border-t border-border flex-shrink-0 w-full z-20 pb-safe">
                <div class="relative flex items-center gap-2 w-full">
                    <input id="msg-input" type="text" placeholder="Transmit secure message..." autocomplete="off"
                        class="flex-1 bg-black/30 border border-border text-white px-4 py-3 rounded-full focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-gray-600 text-sm">
                    
                    <button class="w-11 h-11 bg-primary hover:bg-primary-hover text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/20 transition-transform active:scale-95 flex-shrink-0" onclick="window.sendMessage()">
                        <i data-lucide="send" class="w-5 h-5 ml-0.5"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    lucide.createIcons();

    const { data: msgs } = await supabase.from('messages').select('*, profiles(full_name)').order('created_at', {ascending: true}).limit(50);
    renderMessages(msgs || []);
    scrollToBottom();

    const input = document.getElementById('msg-input');
    input.addEventListener('keypress', (e) => { if(e.key === 'Enter') window.sendMessage(); });

    // Focus input on load (optional, might pop keyboard on mobile)
    // input.focus();

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
        <div class="flex flex-col ${m.user_id === currentUser.id ? 'items-end' : 'items-start'} animate-fade-in w-full">
            <div class="text-[10px] uppercase font-bold text-gray-500 mb-1 px-1 tracking-wider">${m.profiles?.full_name || 'Unknown'}</div>
            <div class="max-w-[85%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${m.user_id === currentUser.id ? 'bg-primary text-white rounded-br-none' : 'bg-card border border-border text-gray-200 rounded-bl-none'}">
                ${escapeHtml(m.content)}
            </div>
        </div>
    `).join('');

    box.insertAdjacentHTML('beforeend', html);
}

window.sendMessage = async () => {
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if(!text) return;
    
    // Clear input immediately for better UX
    input.value = ''; 
    
    await supabase.from('messages').insert({ content: text, user_id: currentUser.id });
    
    // Keep focus on desktop, but maybe not on mobile to prevent keyboard flickering
    if(window.innerWidth > 768) input.focus();
};

// --- TASKS SYSTEM ---
async function loadUserTasks() {
    const container = document.getElementById('user-content');
    container.innerHTML = `
        <div class="p-4 md:p-8 overflow-y-auto h-full w-full">
            <h2 class="font-heading font-bold text-2xl md:text-3xl text-white mb-6 tracking-wide mt-12 md:mt-0">MY OBJECTIVES</h2>
            <div id="task-list" class="grid grid-cols-1 gap-4 max-w-4xl pb-20">
                <div class="text-center py-12 text-gray-500 animate-pulse">Scanning database...</div>
            </div>
        </div>
    `;
    
    const { data: tasks } = await supabase.from('tasks').select('*').eq('assigned_to', currentUser.id).order('created_at', {ascending:false});
    
    const list = document.getElementById('task-list');
    if(!tasks || tasks.length===0) return list.innerHTML = `
        <div class="bg-card border border-border border-dashed rounded-xl p-10 text-center flex flex-col items-center">
            <div class="w-16 h-16 bg-card rounded-full flex items-center justify-center mb-4 text-gray-500"><i data-lucide="check" class="w-8 h-8"></i></div>
            <p class="text-gray-400 font-heading text-lg">ALL OBJECTIVES CLEARED</p>
        </div>`;

    list.innerHTML = tasks.map(t => {
        const colors = {
            pending: 'border-gray-500 text-gray-400',
            submitted: 'border-warning text-warning',
            approved: 'border-success text-success',
            rejected: 'border-danger text-danger'
        };
        const statusColor = colors[t.status] || colors.pending;

        return `
        <div class="bg-card border border-border rounded-xl p-5 relative overflow-hidden group hover:border-gray-600 transition-colors shadow-lg">
            <div class="absolute left-0 top-0 bottom-0 w-1 ${statusColor.split(' ')[0].replace('text', 'bg')}"></div>
            <div class="flex justify-between items-start mb-3">
                <h3 class="font-bold text-white text-lg mr-2">${t.title}</h3>
                <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-black/30 rounded shrink-0 ${statusColor}">${t.status}</span>
            </div>
            
            ${t.feedback ? `<div class="bg-red-500/10 border border-red-500/20 p-3 rounded text-sm text-red-400 mb-4 flex gap-2 items-start"><i data-lucide="alert-circle" class="w-4 h-4 mt-0.5 shrink-0"></i> <span>${t.feedback}</span></div>` : ''}

            <div class="flex justify-between items-center mt-4">
                <span class="text-xs text-gray-600 font-mono">${new Date(t.created_at).toLocaleDateString()}</span>
                ${(t.status === 'pending' || t.status === 'rejected') ? 
                `<button onclick="window.submitProof(${t.id})" class="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded shadow-lg shadow-primary/20 transition-all">SUBMIT PROOF</button>` : ''}
            </div>
        </div>
    `;
    }).join('');
    lucide.createIcons();
}

window.submitProof = (id) => {
    showModal('SUBMIT EVIDENCE', `
        <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Proof Link / Details</label>
        <textarea id="proof-val" rows="3" class="w-full bg-dark border border-border text-white p-3 rounded-lg focus:outline-none focus:border-primary" placeholder="Paste Imgur link or Google Drive URL..."></textarea>
        <button class="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 mt-4 rounded-lg transition-all" onclick="window.doSubmit(${id})">TRANSMIT DATA</button>
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
function escapeHtml(text) { return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
