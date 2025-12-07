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
        <div class="layout">
            <aside class="sidebar">
                <div class="sidebar-header" style="color:#ef4444;">ADMIN PANEL</div>
                <nav class="nav">
                    <button class="nav-btn" onclick="window.loadAdminView('staff')">Staff Manager</button>
                    <button class="nav-btn" onclick="window.loadAdminView('ranks')">Rank Manager</button>
                    <button class="nav-btn active" onclick="window.loadAdminView('approvals')">Task Approvals</button>
                    <button class="nav-btn" onclick="window.loadAdminView('assign')">Assign Tasks</button>
                </nav>
                <div style="padding: 20px;">
                    <button onclick="window.location.reload()" class="btn btn-primary" style="width:100%">Back to User View</button>
                </div>
            </aside>
            <main id="admin-content" class="content"></main>
        </div>
    `;
    
    // Default
    loadApprovals();

    window.loadAdminView = (view) => {
        if(view === 'staff') loadStaffManager();
        if(view === 'ranks') loadRankManager();
        if(view === 'approvals') loadApprovals();
        if(view === 'assign') loadAssignTask();
    };
}

// --- 1. TASK APPROVALS ---
async function loadApprovals() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `<h2>Pending Approvals</h2><div id="approval-list" style="margin-top:20px;">Loading...</div>`;

    // Fetch tasks that are 'submitted'
    const { data: tasks } = await supabase.from('tasks').select('*, profiles!assigned_to(full_name)').eq('status', 'submitted');

    const list = document.getElementById('approval-list');
    if(!tasks.length) return list.innerHTML = `<p>No pending proofs to review.</p>`;

    list.innerHTML = tasks.map(t => `
        <div class="task-card status-submitted">
            <h3>${t.title}</h3>
            <p style="color:gray">Submitted by: ${t.profiles?.full_name}</p>
            <div style="background:#000; padding:10px; margin:10px 0; border-radius:5px; word-break:break-all;">
                Proof: <a href="${t.proof_content}" target="_blank" style="color:#3b82f6;">${t.proof_content}</a>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-primary" style="background:#22c55e" onclick="window.judgeTask(${t.id}, 'approved')">Approve</button>
                <button class="btn btn-danger" onclick="window.judgeTask(${t.id}, 'rejected')">Reject</button>
            </div>
        </div>
    `).join('');
}

window.judgeTask = async (id, decision) => {
    let feedback = null;
    if(decision === 'rejected') {
        feedback = prompt("Reason for rejection:");
        if(!feedback) return;
    }
    await supabase.from('tasks').update({ status: decision, feedback: feedback }).eq('id', id);
    loadApprovals();
};

// --- 2. STAFF MANAGER (Promote/Demote) ---
async function loadStaffManager() {
    const container = document.getElementById('admin-content');
    container.innerHTML = `<h2>Staff Manager</h2><table style="margin-top:20px;"><thead><tr><th>Name</th><th>Rank</th><th>Action</th></tr></thead><tbody id="staff-table"></tbody></table>`;
    
    const { data: staff } = await supabase.from('profiles').select('*, ranks(name)');
    document.getElementById('staff-table').innerHTML = staff.map(u => `
        <tr>
            <td>${u.full_name}</td>
            <td>${u.ranks?.name || 'None'}</td>
            <td><button class="btn btn-primary" onclick="window.editStaff('${u.id}')">Manage</button></td>
        </tr>
    `).join('');
}

window.editStaff = async (id) => {
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending:false});
    showModal('Change Rank', `
        <select id="new-rank">${ranks.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}</select>
        <button class="btn btn-primary" style="width:100%; margin-top:10px;" onclick="window.saveRank('${id}')">Update User</button>
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
    container.innerHTML = `<h2>Rank Manager</h2><button class="btn btn-primary" onclick="window.addRank()">+ New Rank</button><div id="rank-list" style="margin-top:20px;"></div>`;
    
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending:false});
    document.getElementById('rank-list').innerHTML = ranks.map(r => `
        <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #333;">
            <span>${r.name} (Lvl ${r.weight})</span>
            <button class="btn btn-danger" onclick="window.deleteRank(${r.id})">Delete</button>
        </div>
    `).join('');
}
window.addRank = async () => {
    const name = prompt("Rank Name:");
    const weight = prompt("Weight (1-100):");
    if(name && weight) {
        await supabase.from('ranks').insert({ name, weight });
        loadRankManager();
    }
};
window.deleteRank = async (id) => {
    if(confirm('Delete rank?')) {
        await supabase.from('ranks').delete().eq('id', id);
        loadRankManager();
    }
}

// --- 4. ASSIGN TASK ---
async function loadAssignTask() {
    const container = document.getElementById('admin-content');
    const { data: staff } = await supabase.from('profiles').select('*');
    
    container.innerHTML = `
        <h2>Assign New Task</h2>
        <label>Task Title</label><input id="t-title">
        <label>Assign To</label>
        <select id="t-assign">${staff.map(u => `<option value="${u.id}">${u.full_name}</option>`).join('')}</select>
        <button class="btn btn-primary" style="margin-top:10px;" onclick="window.createTask()">Assign Task</button>
    `;
}
window.createTask = async () => {
    const title = document.getElementById('t-title').value;
    const uid = document.getElementById('t-assign').value;
    await supabase.from('tasks').insert({ title, assigned_to: uid, status: 'pending' });
    alert("Task Assigned!");
    loadAssignTask();
}
