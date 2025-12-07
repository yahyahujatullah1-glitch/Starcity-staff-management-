import { supabase } from './config.js';

// --- STATE ---
const app = document.getElementById('app');
const loader = document.getElementById('global-loader');
let currentUser = null;

// --- INIT ---
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (loader) loader.style.display = 'none';
    app.style.display = 'block';

    if (!session) {
        renderLogin();
    } else {
        currentUser = session.user;
        handleRouting();
    }
}

// --- ROUTER ---
function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    renderSidebar(); 
    updateActiveLink(hash);

    // Close any open modals on route change
    closeModal();

    switch(hash) {
        case '#dashboard': renderDashboard(); break;
        case '#staff': renderStaff(); break;
        case '#ranks': renderRanks(); break;
        case '#departments': renderDepartments(); break;
        case '#promotions': renderPromotions(); break;
        case '#tasks': renderTasks(); break;
        case '#logs': renderLogs(); break;
        case '#documents': renderDocuments(); break;
        case '#settings': renderSettings(); break;
        default: renderDashboard();
    }
}

// ==========================================
// 1. DASHBOARD
// ==========================================
async function renderDashboard() {
    setViewTitle('Command Center', null);
    const container = document.getElementById('view-content');
    
    const [staff, depts, active] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('departments').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active')
    ]);
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Total Staff</div><div class="stat-value">${staff.count || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Departments</div><div class="stat-value" style="color:#3b82f6">${depts.count || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Active Duty</div><div class="stat-value" style="color:#22c55e">${active.count || 0}</div></div>
        </div>
        <div class="stat-card">
            <h3>Recent System Activity</h3>
            <div id="dash-logs" style="margin-top:10px;">Loading...</div>
        </div>
    `;

    const { data: logs } = await supabase.from('audit_logs').select('action, created_at, target:profiles!target_id(full_name)').order('created_at', {ascending:false}).limit(5);
    document.getElementById('dash-logs').innerHTML = logs?.map(l => 
        `<div style="padding:10px 0; border-bottom:1px solid #3f3f46; display:flex; justify-content:space-between;">
            <span style="color:white;">${l.target?.full_name || 'System'}</span> 
            <span style="color:#3b82f6;">${l.action}</span>
         </div>`
    ).join('') || 'No recent activity.';
}

// ==========================================
// 2. STAFF MANAGEMENT (Functional)
// ==========================================
async function renderStaff() {
    setViewTitle('Staff Management', '<button class="btn-primary" onclick="alert(\'To add staff, they must sign up via the Login Page.\')">+ Add Staff</button>');
    const container = document.getElementById('view-content');
    
    container.innerHTML = `
        <input type="text" id="staff-search" placeholder="Search staff by name..." style="margin-bottom:20px;">
        <table>
            <thead><tr><th>Name</th><th>Dept</th><th>Rank</th><th>Status</th><th>Manage</th></tr></thead>
            <tbody id="staff-table"><tr><td colspan="5">Loading...</td></tr></tbody>
        </table>
    `;

    const { data: users } = await supabase.from('profiles').select('*, ranks(name), departments(name, color_hex)').order('created_at', {ascending:false});
    
    window.allStaff = users; // Store for search

    const renderTable = (list) => {
        document.getElementById('staff-table').innerHTML = list.map(u => `
            <tr>
                <td><b>${u.full_name}</b><br><small style="color:gray">${u.callsign || ''}</small></td>
                <td><span style="color:${u.departments?.color_hex || 'white'}">${u.departments?.name || '-'}</span></td>
                <td>${u.ranks?.name || '-'}</td>
                <td><span style="color:${u.status=='active'?'#22c55e':u.status=='suspended'?'#ef4444':'#eab308'}">${u.status.toUpperCase()}</span></td>
                <td><button class="btn-sm" onclick="window.openEditStaffModal('${u.id}')">Edit Profile</button></td>
            </tr>
        `).join('');
    };
    renderTable(users || []);

    document.getElementById('staff-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        renderTable(window.allStaff.filter(u => u.full_name.toLowerCase().includes(term)));
    });
}

// --- STAFF ACTIONS ---
window.openEditStaffModal = async (id) => {
    // 1. Fetch Data
    const { data: user } = await supabase.from('profiles').select('*').eq('id', id).single();
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending:false});
    const { data: depts } = await supabase.from('departments').select('*');

    // 2. Show Modal
    showModal('Edit Staff Profile', `
        <input type="hidden" id="e-id" value="${user.id}">
        <input type="hidden" id="e-old-rank" value="${user.rank_id}">
        
        <label>Full Name</label>
        <input id="e-name" value="${user.full_name}">
        
        <label>Department</label>
        <select id="e-dept">${depts.map(d => `<option value="${d.id}" ${d.id==user.department_id?'selected':''}>${d.name}</option>`).join('')}</select>
        
        <label>Rank</label>
        <select id="e-rank">${ranks.map(r => `<option value="${r.id}" ${r.id==user.rank_id?'selected':''}>${r.name}</option>`).join('')}</select>
        
        <label>Status</label>
        <select id="e-status">
            <option value="active" ${user.status=='active'?'selected':''}>Active</option>
            <option value="loa" ${user.status=='loa'?'selected':''}>LOA</option>
            <option value="suspended" ${user.status=='suspended'?'selected':''}>Suspended</option>
            <option value="retired" ${user.status=='retired'?'selected':''}>Retired</option>
        </select>

        <div id="reason-box" style="display:none; margin-top:10px; border:1px solid #eab308; padding:10px; border-radius:5px;">
            <label style="color:#eab308">Reason for Rank Change (Required)</label>
            <input id="e-reason" placeholder="e.g. Passed Exam / Resigned">
        </div>

        <button class="btn-primary" style="width:100%; margin-top:15px;" onclick="window.saveStaff()">Save Changes</button>
    `);

    // Toggle Reason Box
    document.getElementById('e-rank').onchange = (e) => {
        const old = document.getElementById('e-old-rank').value;
        document.getElementById('reason-box').style.display = (e.target.value != old) ? 'block' : 'none';
    };
};

window.saveStaff = async () => {
    const id = document.getElementById('e-id').value;
    const name = document.getElementById('e-name').value;
    const dept = document.getElementById('e-dept').value;
    const rank = document.getElementById('e-rank').value;
    const status = document.getElementById('e-status').value;
    const oldRank = document.getElementById('e-old-rank').value;
    const reason = document.getElementById('e-reason')?.value;

    if (rank != oldRank && !reason) return alert("Please enter a reason for the rank change.");

    await supabase.from('profiles').update({ full_name: name, department_id: dept, rank_id: rank, status }).eq('id', id);

    if (rank != oldRank) {
        await supabase.from('audit_logs').insert({
            actor_id: currentUser.id, target_id: id, action: 'RANK_CHANGE', details: { old: oldRank, new: rank, reason }
        });
    }

    closeModal();
    renderStaff();
};

// ==========================================
// 3. RANKS (Functional)
// ==========================================
async function renderRanks() {
    setViewTitle('Rank Structure', '<button class="btn-primary" onclick="window.openAddRankModal()">+ Add Rank</button>');
    const container = document.getElementById('view-content');
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending:false});
    
    container.innerHTML = `
        <table>
            <thead><tr><th>Weight</th><th>Rank Name</th><th>Actions</th></tr></thead>
            <tbody>
                ${ranks.map(r => `
                    <tr>
                        <td>${r.weight}</td>
                        <td>${r.name}</td>
                        <td>
                            <button class="btn-sm" onclick="window.openEditRankModal(${r.id}, '${r.name}', ${r.weight})">Edit</button>
                            <button class="btn-sm" style="background:#ef4444" onclick="window.deleteRank(${r.id})">Delete</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>
    `;
}

window.openAddRankModal = () => {
    showModal('Add New Rank', `
        <label>Rank Name</label><input id="r-name" placeholder="e.g. Senior Admin">
        <label>Weight (Hierarchy Level)</label><input id="r-weight" type="number" placeholder="1-100">
        <button class="btn-primary" onclick="window.saveNewRank()">Create Rank</button>
    `);
};
window.saveNewRank = async () => {
    const name = document.getElementById('r-name').value;
    const weight = document.getElementById('r-weight').value;
    if(!name || !weight) return alert("Fill all fields");
    await supabase.from('ranks').insert({ name, weight });
    closeModal(); renderRanks();
};
window.openEditRankModal = (id, name, weight) => {
    showModal('Edit Rank', `
        <label>Rank Name</label><input id="edit-r-name" value="${name}">
        <label>Weight</label><input id="edit-r-weight" type="number" value="${weight}">
        <button class="btn-primary" onclick="window.updateRank(${id})">Save Changes</button>
    `);
};
window.updateRank = async (id) => {
    await supabase.from('ranks').update({ name: document.getElementById('edit-r-name').value, weight: document.getElementById('edit-r-weight').value }).eq('id', id);
    closeModal(); renderRanks();
};
window.deleteRank = async (id) => {
    if(confirm("Delete this rank?")) {
        await supabase.from('ranks').delete().eq('id', id);
        renderRanks();
    }
};

// ==========================================
// 4. DEPARTMENTS (Functional)
// ==========================================
async function renderDepartments() {
    setViewTitle('Departments', '<button class="btn-primary" onclick="window.openAddDeptModal()">+ Add Dept</button>');
    const container = document.getElementById('view-content');
    const { data: depts } = await supabase.from('departments').select('*');
    
    container.innerHTML = `
        <div class="stats-grid">
            ${depts.map(d => `
                <div class="stat-card" style="border-left:4px solid ${d.color_hex}">
                    <h3>${d.name}</h3>
                    <div style="margin-top:5px; color:gray;">Code: ${d.code}</div>
                    <button class="btn-sm" style="margin-top:10px; background:#ef4444" onclick="window.deleteDept(${d.id})">Delete</button>
                </div>
            `).join('')}
        </div>
    `;
}
window.openAddDeptModal = () => {
    showModal('Add Department', `
        <label>Name</label><input id="d-name">
        <label>Code</label><input id="d-code" placeholder="e.g. HR">
        <label>Color (Hex)</label><input id="d-color" type="color" value="#3b82f6" style="height:40px;">
        <button class="btn-primary" onclick="window.saveDept()">Create</button>
    `);
};
window.saveDept = async () => {
    const name = document.getElementById('d-name').value;
    const code = document.getElementById('d-code').value;
    const color = document.getElementById('d-color').value;
    await supabase.from('departments').insert({ name, code, color_hex: color });
    closeModal(); renderDepartments();
};
window.deleteDept = async (id) => {
    if(confirm("Delete department?")) {
        await supabase.from('departments').delete().eq('id', id);
        renderDepartments();
    }
};

// ==========================================
// 6. TASKS (Functional)
// ==========================================
async function renderTasks() {
    setViewTitle('Duty Assignments', '<button class="btn-primary" onclick="window.openAddTaskModal()">+ Assign Task</button>');
    const container = document.getElementById('view-content');
    const { data: tasks } = await supabase.from('tasks').select('*, profiles!assigned_to(full_name)').order('created_at', {ascending:false});

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>Pending</h3><div class="stat-value" style="color:#eab308">${tasks.filter(t=>!t.is_completed).length}</div></div>
            <div class="stat-card"><h3>Completed</h3><div class="stat-value" style="color:#22c55e">${tasks.filter(t=>t.is_completed).length}</div></div>
        </div>
        <table>
            <thead><tr><th>Task</th><th>Assigned To</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
                ${tasks.map(t => `
                    <tr>
                        <td>${t.title}</td>
                        <td>${t.profiles?.full_name || 'Unassigned'}</td>
                        <td>${t.is_completed ? '✅ Done' : '⏳ Pending'}</td>
                        <td>${!t.is_completed ? `<button class="btn-sm" onclick="window.completeTask(${t.id})">Mark Done</button>` : `<button class="btn-sm" style="background:#ef4444" onclick="window.deleteTask(${t.id})">Delete</button>`}</td>
                    </tr>`).join('')}
            </tbody>
        </table>
    `;
}
window.openAddTaskModal = () => {
    showModal('New Task', `
        <label>Task Description</label><input id="t-title">
        <button class="btn-primary" onclick="window.saveTask()">Assign</button>
    `);
};
window.saveTask = async () => {
    const title = document.getElementById('t-title').value;
    if(title) {
        await supabase.from('tasks').insert({ title, created_by: currentUser.id });
        closeModal(); renderTasks();
    }
};
window.completeTask = async (id) => {
    await supabase.from('tasks').update({ is_completed: true }).eq('id', id);
    renderTasks();
};
window.deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    renderTasks();
};

// ==========================================
// 8. DOCUMENTS (Functional)
// ==========================================
async function renderDocuments() {
    setViewTitle('Document Links', '<button class="btn-primary" onclick="window.addDocument()">+ Add Link</button>');
    const container = document.getElementById('view-content');
    const { data: docs } = await supabase.from('documents').select('*, profiles!uploaded_by(full_name)').order('created_at', { ascending: false });
    
    if(!docs || docs.length === 0) return container.innerHTML = `<p style="padding:20px; color:gray;">No documents. Click 'Add Link' to start.</p>`;
    
    container.innerHTML = `
        <table>
            <thead><tr><th>Name</th><th>Added By</th><th>Action</th></tr></thead>
            <tbody>
                ${docs.map(d => `
                    <tr>
                        <td><a href="${d.url}" target="_blank" style="color:white; font-weight:bold;">${d.title}</a></td>
                        <td>${d.profiles?.full_name || 'Unknown'}</td>
                        <td>
                            <a href="${d.url}" target="_blank" class="btn-sm" style="background:#3b82f6; text-decoration:none;">Open</a>
                            <button class="btn-sm" style="background:#ef4444" onclick="window.deleteDocument(${d.id})">Delete</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>
    `;
}
window.addDocument = async () => {
    const title = prompt("Document Title:");
    if(!title) return;
    const url = prompt("Link URL:");
    if(url) {
        await supabase.from('documents').insert({ title, url, uploaded_by: currentUser.id });
        renderDocuments();
    }
};
window.deleteDocument = async (id) => {
    if(confirm("Delete Link?")) {
        await supabase.from('documents').delete().eq('id', id);
        renderDocuments();
    }
};

// ==========================================
// VIEW-ONLY TABS (Logs, Promotions, Settings)
// ==========================================
async function renderPromotions() {
    setViewTitle('Promotions Log', null);
    const container = document.getElementById('view-content');
    const { data: logs } = await supabase.from('audit_logs').select('*, target:profiles!target_id(full_name), actor:profiles!actor_id(full_name)').eq('action', 'RANK_CHANGE').order('created_at', {ascending:false});
    
    container.innerHTML = `
        <table>
            <thead><tr><th>Staff</th><th>Change</th><th>Reason</th><th>By Admin</th></tr></thead>
            <tbody>
                ${logs.map(l => `<tr><td>${l.target?.full_name}</td><td>${l.details?.new > l.details?.old ? '⬆️ Promoted' : '⬇️ Demoted'}</td><td>${l.details?.reason || '-'}</td><td>${l.actor?.full_name}</td></tr>`).join('')}
            </tbody>
        </table>`;
}

async function renderLogs() {
    setViewTitle('System Logs', null);
    const container = document.getElementById('view-content');
    const { data: logs } = await supabase.from('audit_logs').select('*, target:profiles!target_id(full_name)').order('created_at', {ascending:false}).limit(50);
    container.innerHTML = `<table><thead><tr><th>Time</th><th>Action</th><th>Target</th></tr></thead><tbody>${logs.map(l => `<tr><td>${new Date(l.created_at).toLocaleString()}</td><td>${l.action}</td><td>${l.target?.full_name}</td></tr>`).join('')}</tbody></table>`;
}

async function renderSettings() {
    setViewTitle('Settings', null);
    document.getElementById('view-content').innerHTML = `<p style="padding:20px;">Settings are currently read-only in this version.</p>`;
}

// ==========================================
// UTILITIES (Modals, Sidebar)
// ==========================================
function renderSidebar() {
    if (document.getElementById('sidebar')) return;
    app.innerHTML = `
        <div class="dashboard-layout">
            <aside id="sidebar" class="sidebar">
                <div class="brand"><i data-lucide="shield-check"></i> ADMIN PANEL</div>
                <nav>
                    <a href="#dashboard" class="nav-item"><i data-lucide="layout-dashboard"></i> Dashboard</a>
                    <a href="#staff" class="nav-item"><i data-lucide="users"></i> Staff</a>
                    <a href="#ranks" class="nav-item"><i data-lucide="award"></i> Ranks</a>
                    <a href="#departments" class="nav-item"><i data-lucide="building"></i> Departments</a>
                    <a href="#promotions" class="nav-item"><i data-lucide="trending-up"></i> Promotions</a>
                    <a href="#tasks" class="nav-item"><i data-lucide="clipboard-list"></i> Tasks</a>
                    <a href="#logs" class="nav-item"><i data-lucide="scroll-text"></i> Logs</a>
                    <a href="#documents" class="nav-item"><i data-lucide="file"></i> Documents</a>
                    <a href="#settings" class="nav-item"><i data-lucide="settings"></i> Settings</a>
                </nav>
                <div style="margin-top:auto; padding:10px;"><button id="logout-btn" style="width:100%; color:#ef4444; background:none; border:none; padding:10px; cursor:pointer;">Logout</button></div>
            </aside>
            <main class="main-content">
                <div id="page-header" class="page-header"><h1 id="page-title">Loading...</h1><div id="page-actions"></div></div>
                <div id="view-content"></div>
            </main>
        </div>
        <!-- GENERIC MODAL -->
        <div id="modal-overlay" class="modal-overlay" style="display:none;">
            <div class="modal-box">
                <div class="modal-header"><h3 id="modal-title">Action</h3><button onclick="window.closeModal()" style="background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">X</button></div>
                <div class="modal-body" id="modal-content"></div>
            </div>
        </div>
    `;
    document.getElementById('logout-btn').onclick = async () => { await supabase.auth.signOut(); window.location.reload(); };
}

function showModal(title, html) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').style.display = 'flex';
}
window.closeModal = () => document.getElementById('modal-overlay').style.display = 'none';

function setViewTitle(title, actionHtml) {
    document.getElementById('page-title').innerText = title;
    document.getElementById('page-actions').innerHTML = actionHtml || '';
    lucide.createIcons();
}
function updateActiveLink(hash) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('href') === hash) el.classList.add('active');
    });
}

function renderLogin() {
    app.innerHTML = `<div class="login-wrapper"><div class="login-box"><h2 style="text-align:center;">Admin Login</h2><form id="login-form"><input id="email" type="email" placeholder="Email"><input id="password" type="password" placeholder="Password"><button class="btn-primary" style="width:100%">Login</button></form></div></div>`;
    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({ email: document.getElementById('email').value, password: document.getElementById('password').value });
        if(!error) window.location.reload(); else alert(error.message);
    };
}

// Start
window.addEventListener('hashchange', handleRouting);
init();
