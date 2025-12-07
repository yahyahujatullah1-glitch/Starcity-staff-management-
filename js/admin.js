import { supabase } from './config.js';
import { showModal, closeModal } from './utils.js';

let currentUser = null;

export function initAdminView(user) {
    currentUser = user;
    renderAdminLayout();
}

function renderAdminLayout() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="flex h-full w-full bg-dark">
            <!-- SIDEBAR -->
            <aside class="w-64 bg-panel border-r border-border hidden md:flex flex-col z-20">
                <div class="p-6 border-b border-border">
                    <h2 class="font-heading font-bold text-xl text-danger tracking-widest flex items-center gap-2">
                        <i data-lucide="shield-alert"></i> ADMIN CORE
                    </h2>
                </div>
                <nav class="flex-1 p-4 space-y-2">
                    <button class="nav-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onclick="window.loadAdminView('approvals', this)">
                        <i data-lucide="check-square" class="w-5 h-5"></i> APPROVALS
                    </button>
                    <button class="nav-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onclick="window.loadAdminView('staff', this)">
                        <i data-lucide="users" class="w-5 h-5"></i> STAFF ROSTER
                    </button>
                    <button class="nav-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onclick="window.loadAdminView('assign', this)">
                        <i data-lucide="plus-square" class="w-5 h-5"></i> ASSIGN TASK
                    </button>
                    <button class="nav-btn w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onclick="window.loadAdminView('ranks', this)">
                        <i data-lucide="award" class="w-5 h-5"></i> RANK EDITOR
                    </button>
                </nav>
                <div class="p-4 border-t border-border">
                    <button onclick="window.location.reload()" class="w-full py-2 bg-primary/10 text-primary border border-primary/20 rounded hover:bg-primary hover:text-white font-bold text-xs transition-all">
                        EXIT ADMIN MODE
                    </button>
                </div>
            </aside>

            <!-- CONTENT -->
            <main id="admin-content" class="flex-1 p-8 overflow-y-auto bg-dark"></main>
        </div>
    `;
    
    // Initial Load
    loadApprovals();

    window.loadAdminView = (view, btn) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('bg-danger/10', 'text-danger'));
        if(btn) btn.classList.add('bg-danger/10', 'text-danger');

        if(view === 'staff') loadStaffManager();
        if(view === 'ranks') loadRankManager();
        if(view === 'approvals') loadApprovals();
        if(view === 'assign') loadAssignTask();
    };
    
    // Set active first btn
    document.querySelector('.nav-btn').click();
}

// --- 1. TASK APPROVALS ---
async function loadApprovals() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `
        <h2 class="font-heading font-bold text-2xl text-white mb-6">PENDING REVIEWS</h2>
        <div id="approval-list" class="grid grid-cols-1 gap-4 max-w-3xl">
            <div class="text-center text-gray-500 py-10">Fetching pending data...</div>
        </div>`;

    const { data: tasks } = await supabase.from('tasks').select('*, profiles!assigned_to(full_name)').eq('status', 'submitted');

    const list = document.getElementById('approval-list');
    if(!tasks.length) return list.innerHTML = `<div class="p-8 border border-border border-dashed rounded-xl text-center text-gray-500">No pending submissions found.</div>`;

    list.innerHTML = tasks.map(t => `
        <div class="bg-card border border-warning/30 rounded-xl p-6 relative overflow-hidden shadow-lg">
            <div class="absolute top-0 left-0 w-1 h-full bg-warning"></div>
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="font-bold text-lg text-white">${t.title}</h3>
                    <p class="text-xs text-gray-400">Agent: <span class="text-white font-bold">${t.profiles?.full_name}</span></p>
                </div>
                <span class="bg-warning/10 text-warning text-xs font-bold px-2 py-1 rounded">REVIEW NEEDED</span>
            </div>
            
            <div class="bg-black/30 p-3 rounded border border-border mb-4">
                <p class="text-xs text-gray-500 uppercase font-bold mb-1">EVIDENCE SUBMITTED</p>
                <a href="${t.proof_content}" target="_blank" class="text-primary hover:text-white text-sm break-all flex items-center gap-2">
                    <i data-lucide="external-link" class="w-4 h-4"></i> ${t.proof_content}
                </a>
            </div>

            <div class="flex gap-3 mt-4">
                <button class="flex-1 bg-success hover:bg-green-600 text-white font-bold py-2 rounded transition-colors text-sm" onclick="window.judgeTask(${t.id}, 'approved')">APPROVE</button>
                <button class="flex-1 bg-danger hover:bg-red-600 text-white font-bold py-2 rounded transition-colors text-sm" onclick="window.judgeTask(${t.id}, 'rejected')">REJECT</button>
            </div>
        </div>
    `).join('');
    lucide.createIcons();
}

window.judgeTask = async (id, decision) => {
    let feedback = null;
    if(decision === 'rejected') {
        feedback = prompt("Rejection Reason (Feedback):");
        if(!feedback) return;
    }
    await supabase.from('tasks').update({ status: decision, feedback: feedback }).eq('id', id);
    loadApprovals();
};

// --- 2. STAFF MANAGER ---
async function loadStaffManager() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `
        <h2 class="font-heading font-bold text-2xl text-white mb-6">OPERATIVE ROSTER</h2>
        <div class="bg-card border border-border rounded-xl overflow-hidden">
            <table class="w-full text-left">
                <thead class="bg-black/30 text-gray-500 text-xs uppercase font-bold">
                    <tr><th class="p-4">Name</th><th class="p-4">Rank</th><th class="p-4 text-right">Action</th></tr>
                </thead>
                <tbody id="staff-table" class="divide-y divide-border"></tbody>
            </table>
        </div>
    `;
    
    const { data: staff } = await supabase.from('profiles').select('*, ranks(name)');
    document.getElementById('staff-table').innerHTML = staff.map(u => `
        <tr class="hover:bg-white/5 transition-colors">
            <td class="p-4 font-bold text-white">${u.full_name}</td>
            <td class="p-4 text-gray-400">${u.ranks?.name || 'Unranked'}</td>
            <td class="p-4 text-right"><button class="text-primary hover:text-white font-bold text-sm" onclick="window.editStaff('${u.id}')">MANAGE</button></td>
        </tr>
    `).join('');
}

window.editStaff = async (id) => {
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending:false});
    showModal('MODITY RANK', `
        <select id="new-rank" class="w-full bg-dark border border-border text-white p-3 rounded mb-4">${ranks.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}</select>
        <button class="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded" onclick="window.saveRank('${id}')">UPDATE PROFILE</button>
    `);
};
window.saveRank = async (userId) => {
    const rankId = document.getElementById('new-rank').value;
    await supabase.from('profiles').update({ rank_id: rankId }).eq('id', userId);
    closeModal(); loadStaffManager();
};

// --- 3. RANK MANAGER ---
async function loadRankManager() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h2 class="font-heading font-bold text-2xl text-white">HIERARCHY CONFIG</h2>
            <button class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded font-bold text-sm" onclick="window.addRank()">+ NEW RANK</button>
        </div>
        <div id="rank-list" class="space-y-2 max-w-2xl"></div>`;
    
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending:false});
    document.getElementById('rank-list').innerHTML = ranks.map(r => `
        <div class="flex justify-between items-center bg-card border border-border p-4 rounded-lg">
            <div>
                <span class="text-white font-bold text-lg">${r.name}</span>
                <span class="text-gray-500 text-xs ml-2">LEVEL ${r.weight}</span>
            </div>
            <button class="text-danger hover:text-red-400 text-sm font-bold" onclick="window.deleteRank(${r.id})">DELETE</button>
        </div>
    `).join('');
}
window.addRank = async () => {
    const name = prompt("Rank Title:");
    const weight = prompt("Weight Level (1-100):");
    if(name && weight) {
        await supabase.from('ranks').insert({ name, weight });
        loadRankManager();
    }
};
window.deleteRank = async (id) => { if(confirm('Delete rank?')) { await supabase.from('ranks').delete().eq('id', id); loadRankManager(); } }

// --- 4. ASSIGN TASK ---
async function loadAssignTask() {
    const container = document.getElementById('admin-content');
    const { data: staff } = await supabase.from('profiles').select('*');
    
    container.innerHTML = `
        <h2 class="font-heading font-bold text-2xl text-white mb-6">ISSUE NEW DIRECTIVE</h2>
        <div class="bg-card border border-border p-6 rounded-xl max-w-xl">
            <label class="block text-xs font-bold text-gray-500 mb-2">OBJECTIVE TITLE</label>
            <input id="t-title" class="w-full bg-dark border border-border text-white p-3 rounded-lg mb-4" placeholder="e.g. Patrol Sector 4">
            
            <label class="block text-xs font-bold text-gray-500 mb-2">ASSIGN AGENT</label>
            <select id="t-assign" class="w-full bg-dark border border-border text-white p-3 rounded-lg mb-6">
                ${staff.map(u => `<option value="${u.id}">${u.full_name}</option>`).join('')}
            </select>
            
            <button class="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 rounded-lg shadow-lg shadow-primary/20" onclick="window.createTask()">CONFIRM ASSIGNMENT</button>
        </div>
    `;
}
window.createTask = async () => {
    const title = document.getElementById('t-title').value;
    const uid = document.getElementById('t-assign').value;
    await supabase.from('tasks').insert({ title, assigned_to: uid, status: 'pending' });
    alert("DIRECTIVE ISSUED SUCCESSFULLY");
    loadAssignTask();
}
