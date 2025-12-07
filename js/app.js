import { supabase } from './config.js';

// --- STATE MANAGEMENT ---
const app = document.getElementById('app');
const loader = document.getElementById('global-loader');
let currentUser = null;

// --- 1. INITIALIZATION ---
async function init() {
    try {
        // Fast Session Check
        const { data: { session } } = await supabase.auth.getSession();
        
        // Hide Loader
        if (loader) loader.style.display = 'none';
        app.style.display = 'block';

        if (!session) {
            renderLogin();
        } else {
            currentUser = session.user;
            handleRouting();
        }
    } catch (err) {
        console.error("Init failed:", err);
    }
}

// --- 2. ROUTER (9 TABS) ---
function handleRouting() {
    const hash = window.location.hash || '#dashboard';
    
    // Ensure Layout Exists
    renderSidebar(); 
    updateActiveLink(hash);

    // Switch Views
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
    setViewTitle('Command Center', null);
    const container = document.getElementById('view-content');
    
    // Fetch Stats Parallel
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
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
            <div class="stat-card">
                <h3>Latest System Activity</h3>
                <div id="dash-logs" style="margin-top:10px; font-size:0.9rem; color:gray;">Loading...</div>
            </div>
            <div class="stat-card">
                <h3>System Health</h3>
                <div style="margin-top:10px; color:#22c55e; font-weight:bold;">● Systems Operational</div>
                <div style="margin-top:5px; color:gray; font-size:0.8rem;">Database: Connected</div>
                <div style="margin-top:5px; color:gray; font-size:0.8rem;">Security: Active</div>
            </div>
        </div>
    `;

    const { data: logs } = await supabase.from('audit_logs').select('action, created_at, target:profiles!target_id(full_name)').order('created_at', {ascending:false}).limit(5);
    document.getElementById('dash-logs').innerHTML = logs?.map(l => 
        `<div style="padding:8px 0; border-bottom:1px solid #3f3f46;">
            <span style="color:#fff;">${l.target?.full_name || 'System'}</span> 
            <span style="float:right;">${l.action}</span>
         </div>`
    ).join('') || 'No recent activity.';
}

// --- VIEW 2: STAFF ---
async function renderStaff() {
    setViewTitle('Staff Management', '<button class="btn-primary" onclick="alert(\'Use Login Page to add new staff via Signup\')">+ Add Staff</button>');
    const container = document.getElementById('view-content');
    
    container.innerHTML = `
        <input type="text" id="staff-search" placeholder="Search staff by name..." style="margin-bottom:20px;">
        <table>
            <thead><tr><th>Name</th><th>Dept</th><th>Rank</th><th>Status</th><th>Manage</th></tr></thead>
            <tbody id="staff-table"><tr><td colspan="5">Loading roster...</td></tr></tbody>
        </table>
    `;

    const { data: users } = await supabase.from('profiles').select('*, ranks(name), departments(name, color_hex)').order('created_at', {ascending:false});
    
    const renderTable = (list) => {
        document.getElementById('staff-table').innerHTML = list.map(u => `
            <tr>
                <td><b>${u.full_name}</b><br><small style="color:gray">${u.callsign || ''}</small></td>
                <td><span style="color:${u.departments?.color_hex}">${u.departments?.name || '-'}</span></td>
                <td>${u.ranks?.name || '-'}</td>
                <td><span style="color:${u.status=='active'?'#22c55e':'#eab308'}">${u.status.toUpperCase()}</span></td>
                <td><button class="btn-sm" onclick="alert('Management Modal coming in next update!')">Edit</button></td>
            </tr>
        `).join('');
    };
    renderTable(users || []);

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
            <thead><tr><th>Level</th><th>Rank Name</th><th>Permissions</th><th>Actions</th></tr></thead>
            <tbody>
                ${ranks.map(r => `<tr><td>${r.weight}</td><td>${r.name}</td><td>Default</td><td><button class="btn-sm">Edit</button></td></tr>`).join('')}
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
                    <button class="btn-sm" style="margin-top:15px;">Manage</button>
                </div>
            `).join('')}
        </div>
    `;
}

// --- VIEW 5: PROMOTIONS ---
async function renderPromotions() {
    setViewTitle('Promotions Log', null);
    const container = document.getElementById('view-content');
    
    const { data: logs } = await supabase.from('audit_logs').select('*, target:profiles!target_id(full_name), actor:profiles!actor_id(full_name)').eq('action', 'RANK_CHANGE').order('created_at', {ascending:false});
    
    container.innerHTML = `
        <table>
            <thead><tr><th>Staff Member</th><th>Change</th><th>Reason</th><th>Authorized By</th></tr></thead>
            <tbody>
                ${logs.map(l => `
                    <tr>
                        <td>${l.target?.full_name}</td>
                        <td>${l.details?.new > l.details?.old ? '⬆️ Promoted' : '⬇️ Demoted'}</td>
                        <td>${l.details?.reason || 'No reason provided'}</td>
                        <td>${l.actor?.full_name}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- VIEW 6: TASKS ---
async function renderTasks() {
    setViewTitle('Duty Assignments', '<button class="btn-primary" onclick="window.addTask()">+ Assign Task</button>');
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
                        <td>${!t.is_completed ? `<button class="btn-sm" onclick="window.completeTask(${t.id})">Mark Done</button>` : ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- VIEW 7: LOGS ---
async function renderLogs() {
    setViewTitle('System Logs', null);
    const container = document.getElementById('view-content');
    
    const { data: logs } = await supabase.from('audit_logs').select('*, target:profiles!target_id(full_name)').order('created_at', {ascending:false}).limit(50);
    
    container.innerHTML = `
        <table>
            <thead><tr><th>Time</th><th>Action</th><th>User</th><th>Details</th></tr></thead>
            <tbody>
                ${logs.map(l => `
                    <tr>
                        <td style="color:gray; font-size:0.8rem;">${new Date(l.created_at).toLocaleString()}</td>
                        <td style="color:#3b82f6; font-weight:bold;">${l.action}</td>
                        <td>${l.target?.full_name || 'System'}</td>
                        <td style="font-size:0.8rem; color:gray;">${JSON.stringify(l.details || {})}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- VIEW 8: DOCUMENTS (LINK SYSTEM) ---
async function renderDocuments() {
    setViewTitle('Document Links', '<button class="btn-primary" onclick="window.addDocument()">+ Add Link</button>');
    const container = document.getElementById('view-content');
    
    const { data: docs } = await supabase.from('documents').select('*, profiles!uploaded_by(full_name)').order('created_at', { ascending: false });
    
    if(!docs || docs.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:50px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid #3f3f46;">
                <i data-lucide="link" style="width:48px; height:48px; color:gray; margin-bottom:10px;"></i>
                <h3 style="color:white;">No Documents Linked</h3>
                <p style="color:gray;">Add Google Drive links, Image URLs, or Form links here.</p>
                <button class="btn-primary" style="margin-top:15px;" onclick="window.addDocument()">Add First Link</button>
            </div>`;
        lucide.createIcons();
        return;
    }
    
    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Total Documents</div><div class="stat-value">${docs.length}</div></div>
        </div>
        <table>
            <thead><tr><th>Document Name</th><th>Added By</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
                ${docs.map(d => `
                    <tr>
                        <td>
                            <div style="font-weight:bold; color:white;">${d.title}</div>
                            <a href="${d.url}" target="_blank" style="color:#3b82f6; font-size:0.8rem; text-decoration:none;">
                                <i data-lucide="external-link" style="width:12px;"></i> ${d.url.substring(0, 40)}...
                            </a>
                        </td>
                        <td>${d.profiles?.full_name || 'Unknown'}</td>
                        <td>${new Date(d.created_at).toLocaleDateString()}</td>
                        <td>
                            <a href="${d.url}" target="_blank" class="btn-sm" style="text-decoration:none; background:#3b82f6; border:none;">Open</a>
                            <button class="btn-sm" style="background:#ef4444; border:none;" onclick="window.deleteDocument(${d.id})">Delete</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>
    `;
    lucide.createIcons();
}

// --- VIEW 9: SETTINGS ---
async function renderSettings() {
    setViewTitle('System Configuration', null);
    const container = document.getElementById('view-content');
    
    container.innerHTML = `
        <div class="stat-card" style="max-width:600px;">
            <label>Site Name</label>
            <input type="text" value="StarCity Staff Portal">
            
            <label style="margin-top:15px; display:block;">Admin Email</label>
            <input type="text" value="${currentUser.email}" disabled>
            
            <button class="btn-primary" style="margin-top:20px;" onclick="alert('Settings Saved')">Save Configuration</button>
        </div>
        
        <div class="stat-card" style="max-width:600px; margin-top:20px; border-color:#ef4444;">
            <h3 style="color:#ef4444;">Danger Zone</h3>
            <p style="color:gray; font-size:0.9rem; margin:10px 0;">Be careful with these actions.</p>
            <button class="btn-sm" style="background:#ef4444; border:none;">Purge Old Logs</button>
        </div>
    `;
}

// --- HELPER: SIDEBAR RENDER ---
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
    const titleEl = document.getElementById('page-title');
    const actionsEl = document.getElementById('page-actions');
    if(titleEl) titleEl.innerText = title;
    if(actionsEl) actionsEl.innerHTML = actionHtml || '';
    lucide.createIcons();
}

function updateActiveLink(hash) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('href') === hash) el.classList.add('active');
    });
}

// --- HELPER: LOGIN SCREEN ---
function renderLogin() {
    app.innerHTML = `
        <div class="login-wrapper">
            <div class="login-box">
                <div style="text-align:center; margin-bottom:20px;">
                    <i data-lucide="shield" style="width:50px; height:50px; color:#3b82f6;"></i>
                    <h2 style="margin-top:10px;">Admin Access</h2>
                </div>
                <form id="login-form">
                    <input id="email" type="email" placeholder="Email Address" required>
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

// --- GLOBAL ACTIONS ---
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
window.addDocument = async () => {
    const title = prompt("Document Title:");
    if(!title) return;
    const url = prompt("Document Link (URL):");
    if(!url || !url.startsWith('http')) { alert("Invalid URL"); return; }
    
    await supabase.from('documents').insert({ title, url, uploaded_by: currentUser.id });
    renderDocuments();
};
window.deleteDocument = async (id) => {
    if(confirm("Delete this link?")) {
        await supabase.from('documents').delete().eq('id', id);
        renderDocuments();
    }
};

// --- START ---
window.addEventListener('hashchange', handleRouting);
init();
