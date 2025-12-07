import { supabase } from './config.js';

// --- STATE ---
const app = document.getElementById('app');
const loader = document.getElementById('global-loader');
let currentUser = null;

// --- INIT ---
async function init() {
    // 1. Fast Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    
    // 2. Hide Loader Immediately
    if (loader) loader.style.display = 'none';
    app.style.display = 'block';

    // 3. Route
    if (!session) {
        renderLogin();
    } else {
        currentUser = session.user;
        handleRouting();
    }
}

// --- ROUTER (9 Tabs) ---
function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    renderSidebar(); // Ensure sidebar exists
    updateActiveLink(hash);

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

// --- VIEW 1: DASHBOARD ---
async function renderDashboard() {
    setViewTitle('Dashboard', null);
    const container = document.getElementById('view-content');
    
    // Fetch Summary Data
    const { count: staff } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: depts } = await supabase.from('departments').select('*', { count: 'exact', head: true });
    const { count: active } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active');
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Total Staff</div><div class="stat-value">${staff || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Departments</div><div class="stat-value" style="color:#3b82f6">${depts || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Active Duty</div><div class="stat-value" style="color:#22c55e">${active || 0}</div></div>
        </div>
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
            <div class="stat-card">
                <h3>Latest Activity</h3>
                <div id="dash-logs" style="margin-top:10px; font-size:0.9rem; color:gray;">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>System Status</h3>
                <div style="margin-top:10px; color:#22c55e; font-weight:bold;">● All Systems Operational</div>
                <div style="margin-top:5px; color:gray; font-size:0.8rem;">Database: Connected</div>
                <div style="margin-top:5px; color:gray; font-size:0.8rem;">Security: Active</div>
            </div>
        </div>
    `;

    // Load Mini Logs
    const { data: logs } = await supabase.from('audit_logs').select('action, created_at, target:profiles!target_id(full_name)').order('created_at', {ascending:false}).limit(5);
    document.getElementById('dash-logs').innerHTML = logs.map(l => 
        `<div style="padding:8px 0; border-bottom:1px solid #3f3f46;">
            <span style="color:#fff;">${l.target?.full_name || 'System'}</span> 
            <span style="float:right;">${l.action}</span>
         </div>`
    ).join('');
}

// --- VIEW 2: STAFF ---
async function renderStaff() {
    setViewTitle('Staff Management', '<button class="btn-primary" onclick="alert(\'Use Login Page to add new staff via Signup\')">+ Add Staff</button>');
    const container = document.getElementById('view-content');
    
    container.innerHTML = `
        <input type="text" id="staff-search" placeholder="Search staff..." style="margin-bottom:20px;">
        <table>
            <thead><tr><th>Name</th><th>Dept</th><th>Rank</th><th>Status</th><th>Action</th></tr></thead>
            <tbody id="staff-table"><tr><td colspan="5">Loading...</td></tr></tbody>
        </table>
    `;

    const { data: users } = await supabase.from('profiles').select('*, ranks(name), departments(name, color_hex)').order('created_at', {ascending:false});
    
    const renderTable = (list) => {
        document.getElementById('staff-table').innerHTML = list.map(u => `
            <tr>
                <td><b>${u.full_name}</b><br><small>${u.callsign || ''}</small></td>
                <td><span style="color:${u.departments?.color_hex}">${u.departments?.name || '-'}</span></td>
                <td>${u.ranks?.name || '-'}</td>
                <td><span style="color:${u.status=='active'?'#22c55e':'#eab308'}">${u.status.toUpperCase()}</span></td>
                <td><button class="btn-sm" onclick="window.openEditModal('${u.id}')">Manage</button></td>
            </tr>
        `).join('');
    };
    renderTable(users);

    // Search Logic
    document.getElementById('staff-search').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = users.filter(u => u.full_name.toLowerCase().includes(term));
        renderTable(filtered);
    });
}

// --- VIEW 3: RANKS ---
async function renderRanks() {
    setViewTitle('Rank Structure', '<button class="btn-primary">+ Add Rank</button>');
    const container = document.getElementById('view-content');
    
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending:false});
    
    container.innerHTML = `
        <table>
            <thead><tr><th>Weight</th><th>Rank Name</th><th>Actions</th></tr></thead>
            <tbody>
                ${ranks.map(r => `<tr><td>${r.weight}</td><td>${r.name}</td><td><button class="btn-sm">Edit</button></td></tr>`).join('')}
            </tbody>
        </table>
    `;
}

// --- VIEW 4: DEPARTMENTS ---
async function renderDepartments() {
    setViewTitle('Departments', '<button class="btn-primary">+ Add Dept</button>');
    const container = document.getElementById('view-content');
    
    const { data: depts } = await supabase.from('departments').select('*');
    
    container.innerHTML = `
        <div class="stats-grid">
            ${depts.map(d => `
                <div class="stat-card" style="border-left:4px solid ${d.color_hex}">
                    <h3>${d.name}</h3>
                    <div style="margin-top:5px; color:gray;">Code: ${d.code}</div>
                    <button class="btn-sm" style="margin-top:15px;">Edit Details</button>
                </div>
            `).join('')}
        </div>
    `;
}

// --- VIEW 5: PROMOTIONS ---
async function renderPromotions() {
    setViewTitle('Promotions & Demotions', null);
    const container = document.getElementById('view-content');
    
    const { data: logs } = await supabase.from('audit_logs').select('*, target:profiles!target_id(full_name), actor:profiles!actor_id(full_name)').eq('action', 'RANK_CHANGE').order('created_at', {ascending:false});
    
    container.innerHTML = `
        <h3>Recent Rank Changes</h3>
        <table>
            <thead><tr><th>Staff</th><th>Action</th><th>Reason</th><th>By Admin</th></tr></thead>
            <tbody>
                ${logs.map(l => `
                    <tr>
                        <td>${l.target?.full_name}</td>
                        <td>${l.details?.new > l.details?.old ? '⬆️ Promoted' : '⬇️ Demoted'}</td>
                        <td>${l.details?.reason || 'No reason'}</td>
                        <td>${l.actor?.full_name}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- VIEW 6: TASKS ---
async function renderTasks() {
    setViewTitle('Duty Tasks', '<button class="btn-primary" onclick="window.addTask()">+ New Task</button>');
    const container = document.getElementById('view-content');
    
    const { data: tasks } = await supabase.from('tasks').select('*, profiles!assigned_to(full_name)').order('created_at', {ascending:false});

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><h3>Pending</h3><div class="stat-value" style="color:#eab308">${tasks.filter(t=>!t.is_completed).length}</div></div>
            <div class="stat-card"><h3>Completed</h3><div class="stat-value" style="color:#22c55e">${tasks.filter(t=>t.is_completed).length}</div></div>
        </div>
        <table>
            <thead><tr><th>Title</th><th>Assigned To</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
                ${tasks.map(t => `
                    <tr>
                        <td>${t.title}</td>
                        <td>${t.profiles?.full_name || 'Unassigned'}</td>
                        <td>${t.is_completed ? '✅ Done' : '⏳ Pending'}</td>
                        <td>${!t.is_completed ? `<button class="btn-sm" onclick="window.completeTask(${t.id})">Mark Done</button>` : ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- VIEW 7: ACTIVITY LOGS ---
async function renderLogs() {
    setViewTitle('System Activity Logs', null);
    const container = document.getElementById('view-content');
    
    const { data: logs } = await supabase.from('audit_logs').select('*, target:profiles!target_id(full_name)').order('created_at', {ascending:false}).limit(50);
    
    container.innerHTML = `
        <table>
            <thead><tr><th>Time</th><th>Action</th><th>Target User</th><th>Details</th></tr></thead>
            <tbody>
                ${logs.map(l => `
                    <tr>
                        <td style="color:gray; font-size:0.8rem;">${new Date(l.created_at).toLocaleString()}</td>
                        <td style="font-weight:bold; color:#3b82f6;">${l.action}</td>
                        <td>${l.target?.full_name || 'System'}</td>
                        <td style="font-size:0.8rem; color:gray;">${JSON.stringify(l.details || {})}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- VIEW 8: DOCUMENTS ---
async function renderDocuments() {
    setViewTitle('Document Storage', '<button class="btn-primary" onclick="alert(\'Setup Storage Bucket first\')">Upload File</button>');
    const container = document.getElementById('view-content');
    
    const { data: docs } = await supabase.from('documents').select('*');
    
    if(!docs || docs.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:50px; color:gray;">No documents found.</div>`;
        return;
    }
    
    container.innerHTML = `
        <table>
            <thead><tr><th>File Name</th><th>Type</th><th>Uploaded</th><th>Action</th></tr></thead>
            <tbody>
                ${docs.map(d => `<tr><td>${d.file_name}</td><td>${d.file_type}</td><td>${new Date(d.uploaded_at).toLocaleDateString()}</td><td><a href="${d.url}" target="_blank" class="btn-sm">View</a></td></tr>`).join('')}
            </tbody>
        </table>
    `;
}

// --- VIEW 9: SETTINGS ---
async function renderSettings() {
    setViewTitle('System Settings', null);
    const container = document.getElementById('view-content');
    
    container.innerHTML = `
        <div class="stat-card" style="max-width:600px;">
            <label>Website Name</label>
            <input type="text" value="StarCity Staff Portal">
            
            <label style="margin-top:15px; display:block;">Admin Contact Email</label>
            <input type="text" value="${currentUser.email}" disabled>
            
            <label style="margin-top:15px; display:block;">Allow New Signups</label>
            <select>
                <option value="true">Yes, Allow Signups</option>
                <option value="false">No, Close Registration</option>
            </select>
            
            <button class="btn-primary" style="margin-top:20px;" onclick="alert('Settings Saved')">Save Configuration</button>
        </div>
        
        <div class="stat-card" style="max-width:600px; margin-top:20px; border-color:#ef4444;">
            <h3 style="color:#ef4444;">Danger Zone</h3>
            <p style="color:gray; font-size:0.9rem; margin:10px 0;">Actions here cannot be undone.</p>
            <button class="btn-sm" style="background:#ef4444; border:none;">Purge All Logs</button>
        </div>
    `;
}

// --- HELPER: RENDER SIDEBAR ---
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
                    <a href="#logs" class="nav-item"><i data-lucide="scroll-text"></i> Activity Logs</a>
                    <a href="#documents" class="nav-item"><i data-lucide="file"></i> Documents</a>
                    <a href="#settings" class="nav-item"><i data-lucide="settings"></i> Settings</a>
                </nav>
                <div style="margin-top:auto; padding:10px;">
                    <button id="logout-btn" style="width:100%; text-align:left; color:#f87171; background:none; border:none; padding:10px; cursor:pointer; display:flex; gap:10px;"><i data-lucide="log-out"></i> Logout</button>
                </div>
            </aside>
            <main class="main-content">
                <div id="page-header" class="page-header">
                    <h1 id="page-title">Loading...</h1>
                    <div id="page-actions"></div>
                </div>
                <div id="view-content"></div>
            </main>
        </div>
        <div id="modal-overlay" class="modal-overlay" style="display:none;"></div>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
}

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

// --- HELPER: LOGIN VIEW ---
function renderLogin() {
    app.innerHTML = `
        <div class="login-wrapper">
            <div class="login-box">
                <div style="text-align:center; margin-bottom:20px;">
                    <i data-lucide="shield" style="width:50px; height:50px; color:#3b82f6;"></i>
                    <h2 style="margin-top:10px;">Admin Access</h2>
                </div>
                <form id="login-form">
                    <input id="email" type="email" placeholder="Admin Email" required>
                    <input id="password" type="password" placeholder="Password" required>
                    <button class="btn-primary" style="width:100%;">Enter Panel</button>
                </form>
            </div>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.signInWithPassword({
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        });
        if (!error) window.location.reload();
        else alert(error.message);
    });
}

// --- GLOBAL ACTIONS (Window) ---
window.addTask = async () => {
    const t = prompt("Task Title:");
    if(t) {
        await supabase.from('tasks').insert({ title: t, created_by: currentUser.id });
        renderTasks();
    }
};
window.completeTask = async (id) => {
    await supabase.from('tasks').update({ is_completed: true }).eq('id', id);
    renderTasks();
};

// --- START ---
window.addEventListener('hashchange', handleRouting);
init();
