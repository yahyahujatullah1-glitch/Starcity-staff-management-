import { supabase } from './config.js';
import { showModal, closeModal, formatDate } from './utils.js';

let currentUser = null;

export function initUserView(user) {
    currentUser = user;
    renderUserLayout();
}

function renderUserLayout() {
    const app = document.getElementById('app');
    
    // Ensure mobile button is visible
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if(mobileBtn) mobileBtn.style.display = 'block';

    app.innerHTML = `
        <div class="flex h-full w-full bg-dark relative overflow-hidden">
            
            <!-- SIDEBAR (Fixed Z-Index 60 to sit above everything) -->
            <aside class="sidebar fixed inset-y-0 left-0 w-72 bg-[#121215] border-r border-gray-800 transform -translate-x-full md:translate-x-0 z-[60] flex flex-col transition-transform duration-300">
                
                <!-- Sidebar Header -->
                <div class="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div class="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500 border border-blue-500/30">
                        <i data-lucide="shield" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h2 class="font-bold text-xl text-white tracking-widest leading-none" style="font-family: 'Rajdhani', sans-serif;">STARCITY</h2>
                        <span class="text-[10px] text-blue-500 font-bold tracking-[0.2em]">OPERATIVE</span>
                    </div>
                </div>

                <!-- Nav -->
                <nav class="nav-container flex-1 p-4 space-y-2 overflow-y-auto">
                    <button class="nav-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors active-nav" onclick="window.switchView('tasks', this)">
                        <i data-lucide="clipboard-list" class="w-5 h-5"></i> MY ASSIGNMENTS
                    </button>
                    <button class="nav-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onclick="window.switchView('chat', this)">
                        <i data-lucide="message-square" class="w-5 h-5"></i> SECURE COMMS
                    </button>
                </nav>

                <!-- Footer -->
                <div class="p-4 border-t border-gray-800 bg-black/20">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-xs">
                            ${currentUser.email[0].toUpperCase()}
                        </div>
                        <div class="overflow-hidden">
                            <p class="text-white text-sm font-bold truncate">${currentUser.email.split('@')[0]}</p>
                        </div>
                    </div>
                    <button id="logout-btn" class="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500 hover:text-white transition-all">
                        LOGOUT
                    </button>
                </div>
            </aside>

            <!-- MAIN CONTENT (Overlay for sidebar on mobile) -->
            <div id="mobile-overlay" class="fixed inset-0 bg-black/50 z-50 hidden md:hidden glass-blur" onclick="document.querySelector('.sidebar').classList.remove('open'); this.classList.add('hidden');"></div>

            <!-- VIEW AREA -->
            <main id="user-content" class="flex-1 md:ml-72 bg-dark h-full w-full flex flex-col relative z-10"></main>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('logout-btn').onclick = async () => { await supabase.auth.signOut(); window.location.reload(); };
    
    // Default View
    loadUserTasks();

    window.switchView = (view, btn) => {
        // Update Buttons
        document.querySelectorAll('.nav-btn').forEach(b => {
            b.classList.remove('bg-blue-600/10', 'text-white', 'border-l-2', 'border-blue-500');
            b.classList.add('text-gray-400');
        });
        if(btn) {
            btn.classList.add('bg-blue-600/10', 'text-white', 'border-l-2', 'border-blue-500');
            btn.classList.remove('text-gray-400');
        }
        
        // Close Mobile Menu Logic
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-overlay');
        sidebar.classList.remove('open');
        overlay.classList.add('hidden');

        if(view === 'tasks') loadUserTasks();
        if(view === 'chat') loadChat();
    };
    
    // Set active style on first btn initially
    document.querySelector('.nav-btn').click();
}

// --- CHAT SYSTEM (FIXED) ---
async function loadChat() {
    const container = document.getElementById('user-content');
    container.innerHTML = `
        <div class="flex flex-col h-full w-full bg-dark">
            <!-- 1. HEADER (Fixed Height 60px) -->
            <div class="h-[60px] border-b border-gray-800 bg-[#121215] flex items-center px-4 md:px-6 shadow-sm flex-shrink-0 justify-between md:justify-start">
                <div class="w-8 md:hidden"></div> <!-- Spacer for menu btn -->
                <h3 class="font-bold text-white text-lg tracking-wide flex items-center gap-2" style="font-family: 'Rajdhani', sans-serif;">
                    <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    ENCRYPTED CHANNEL
                </h3>
            </div>
            
            <!-- 2. MESSAGES (Fills remaining height) -->
            <div id="chat-box" class="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 w-full scroll-smooth">
                <div class="flex justify-center mt-10"><div class="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div></div>
            </div>
            
            <!-- 3. INPUT (Fixed Bottom, Solid Color) -->
            <div class="p-3 md:p-4 bg-[#18181b] border-t border-gray-700 flex-shrink-0 chat-input-wrapper z-20">
                <div class="flex items-center gap-2 w-full max-w-4xl mx-auto">
                    <input id="msg-input" type="text" placeholder="Type a message..." autocomplete="off"
                        class="flex-1 bg-gray-900 border border-gray-600 text-white px-4 py-3 rounded-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500">
                    
                    <button class="w-11 h-11 bg-blue-600 active:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 flex-shrink-0" onclick="window.sendMessage()">
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

    // Input Listeners
    const input = document.getElementById('msg-input');
    input.addEventListener('keypress', (e) => { if(e.key === 'Enter') window.sendMessage(); });

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
            <div class="max-w-[85%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm break-words ${m.user_id === currentUser.id ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1f1f23] border border-gray-700 text-gray-200 rounded-bl-none'}">
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
    input.value = '';
    await supabase.from('messages').insert({ content: text, user_id: currentUser.id });
    if(window.innerWidth > 768) input.focus();
};

// --- TASKS SYSTEM ---
async function loadUserTasks() {
    const container = document.getElementById('user-content');
    container.innerHTML = `
        <div class="p-4 md:p-8 overflow-y-auto h-full w-full">
            <h2 class="font-bold text-2xl md:text-3xl text-white mb-6 tracking-wide mt-12 md:mt-0" style="font-family:'Rajdhani',sans-serif">MY OBJECTIVES</h2>
            <div id="task-list" class="grid grid-cols-1 gap-4 max-w-4xl pb-20">
                <div class="text-center py-12 text-gray-500 animate-pulse">Scanning database...</div>
            </div>
        </div>
    `;
    
    const { data: tasks } = await supabase.from('tasks').select('*').eq('assigned_to', currentUser.id).order('created_at', {ascending:false});
    
    const list = document.getElementById('task-list');
    if(!tasks || tasks.length===0) return list.innerHTML = `
        <div class="bg-[#18181b] border border-dashed border-gray-700 rounded-xl p-10 text-center flex flex-col items-center">
            <div class="w-16 h-16 bg-[#27272a] rounded-full flex items-center justify-center mb-4 text-gray-500"><i data-lucide="check" class="w-8 h-8"></i></div>
            <p class="text-gray-400 font-bold text-lg">ALL OBJECTIVES CLEARED</p>
        </div>`;

    list.innerHTML = tasks.map(t => {
        const colors = {
            pending: 'border-gray-500 text-gray-400',
            submitted: 'border-yellow-500 text-yellow-500',
            approved: 'border-green-500 text-green-500',
            rejected: 'border-red-500 text-red-500'
        };
        const statusColor = colors[t.status] || colors.pending;

        return `
        <div class="bg-[#18181b] border border-gray-800 rounded-xl p-5 relative overflow-hidden shadow-lg">
            <div class="absolute left-0 top-0 bottom-0 w-1 ${statusColor.split(' ')[0].replace('text', 'bg')}"></div>
            <div class="flex justify-between items-start mb-3">
                <h3 class="font-bold text-white text-lg mr-2">${t.title}</h3>
                <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-black/30 rounded shrink-0 ${statusColor}">${t.status}</span>
            </div>
            
            ${t.feedback ? `<div class="bg-red-500/10 border border-red-500/20 p-3 rounded text-sm text-red-400 mb-4 flex gap-2 items-start"><i data-lucide="alert-circle" class="w-4 h-4 mt-0.5 shrink-0"></i> <span>${t.feedback}</span></div>` : ''}

            <div class="flex justify-between items-center mt-4">
                <span class="text-xs text-gray-600 font-mono">${new Date(t.created_at).toLocaleDateString()}</span>
                ${(t.status === 'pending' || t.status === 'rejected') ? 
                `<button onclick="window.submitProof(${t.id})" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded shadow-lg shadow-blue-600/20 transition-all">SUBMIT PROOF</button>` : ''}
            </div>
        </div>
    `;
    }).join('');
    lucide.createIcons();
}

window.submitProof = (id) => {
    showModal('SUBMIT EVIDENCE', `
        <label class="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Proof Link / Details</label>
        <textarea id="proof-val" rows="3" class="w-full bg-[#050505] border border-gray-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Paste Imgur link or Google Drive URL..."></textarea>
        <button class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 mt-4 rounded-lg transition-all" onclick="window.doSubmit(${id})">TRANSMIT DATA</button>
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
