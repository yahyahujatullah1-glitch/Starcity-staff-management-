import { supabase } from './config.js';

// --- CONFIGURATION ---
// Paste your Discord Webhook URL here if you want notifications
const DISCORD_WEBHOOK_URL = ''; 

// --- GLOBAL STATE ---
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
    renderLayout(currentUser);
    
    if (hash === '#staff') renderStaffPage();
    else if (hash === '#tasks') renderTasksPage();
    else renderDashboardPage();
}

// --- VIEW: LOGIN ---
function renderLogin() {
    app.innerHTML = `
        <div class="login-wrapper">
            <div class="login-box">
                <div class="login-header">
                    <i data-lucide="shield" style="width:50px; height:50px; color:#3b82f6;"></i>
                    <h2 style="margin-top:10px;">Staff Portal</h2>
                    <p>Authorized Access Only</p>
                </div>
                <form id="login-form">
                    <div class="input-group">
                        <label>Email</label>
                        <input id="email" type="email" required>
                    </div>
                    <div class="input-group">
                        <label>Password</label>
                        <input id="password" type="password" required>
                    </div>
                    <button class="btn-primary">Secure Login</button>
                </form>
            </div>
        </div>`;
        
    lucide.createIcons();

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerText = "Verifying...";
        
        const { error } = await supabase.auth.signInWithPassword({ 
            email: document.getElementById('email').value, 
            password: document.getElementById('password').value 
        });

        if(!error) window.location.reload(); 
        else { alert(error.message); btn.innerText = "Secure Login"; }
    });
}

// --- LAYOUT (SIDEBAR) ---
function renderLayout(user) {
    if (document.getElementById('sidebar')) return;
    
    app.innerHTML = `
        <div class="dashboard-layout">
            <aside id="sidebar" class="sidebar">
                <div class="brand">
                    <i data-lucide="shield-check"></i> STARCITY
                </div>
                <nav>
                    <a href="#dashboard" class="nav-item"><i data-lucide="layout-dashboard"></i> Dashboard</a>
                    <a href="#staff" class="nav-item"><i data-lucide="users"></i> Staff Roster</a>
                    <a href="#tasks" class="nav-item"><i data-lucide="clipboard-list"></i> Duty Tasks</a>
                </nav>
                <div style="margin-top:auto;">
                    <div style="padding:10px; font-size:0.8rem; color:gray; border-top:1px solid #27272a;">
                        User: ${user.email}
                    </div>
                    <button id="logout-btn" style="width:100%; text-align:left; padding:10px; background:none; border:none; color:#f87171; cursor:pointer; display:flex; gap:10px;">
                        <i data-lucide="log-out"></i> Logout
                    </button>
                </div>
            </aside>
            <main id="main-view" class="main-content"></main>
        </div>
        
        <!-- EDIT MODAL CONTAINER -->
        <div id="modal-overlay" class="modal-overlay" style="display:none;"></div>
    `;
    
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
    lucide.createIcons();
}

// --- VIEW: DASHBOARD ---
async function renderDashboardPage() {
    const main = document.getElementById('main-view');
    
    // Analytics
    const { count: staffCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: activeCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: taskCount } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('is_completed', false);

    main.innerHTML = `
        <div class="page-header"><h1>Command Center</h1></div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">TOTAL STAFF</div>
                <div class="stat-value">${staffCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">ACTIVE DUTY</div>
                <div class="stat-value" style="color: #4ade80">${activeCount}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">PENDING TASKS</div>
                <div class="stat-value" style="color: #facc15">${taskCount}</div>
            </div>
        </div>

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
            <div class="table-container">
                <h3 style="padding:15px; border-bottom:1px solid #3f3f46;">Recent Activity Log</h3>
                <table style="width:100%;">
                    <tbody id="audit-list"><tr><td style="padding:15px;">Loading logs...</td></tr></tbody>
                </table>
            </div>
            
            <div class="stat-card">
                <h3 style="margin-bottom:10px;">Top Performers (XP)</h3>
                <div id="top-performers"></div>
            </div>
        </div>
    `;

    // Fetch Logs
    const { data: logs } = await supabase.from('audit_logs').select('action, details, created_at, target:profiles!target_id(full_name)').order('created_at', { ascending: false }).limit(6);
    document.getElementById('audit-list').innerHTML = logs.map(log => `
        <tr style="border-bottom:1px solid #27272a;">
            <td style="padding:12px; color:#3b82f6; font-weight:bold; font-size:0.8rem;">${log.action}</td>
            <td style="padding:12px; font-size:0.9rem;">${log.details?.reason ? `Reason: ${log.details.reason}` : (log.target?.full_name || 'System')}</td>
            <td style="padding:12px; color:gray; font-size:0.8rem;">${new Date(log.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');

    // Fetch Top XP
    const { data: topUsers } = await supabase.from('profiles').select('full_name, xp, ranks(name)').order('xp', {ascending: false}).limit(3);
    document.getElementById('top-performers').innerHTML = topUsers.map(u => `
        <div style="display:flex; justify-content:space-between; border-bottom:1px solid #3f3f46; padding:10px 0;">
            <div>
                <div style="font-weight:600;">${u.full_name}</div>
                <div style="font-size:0.75rem; color:gray;">${u.ranks?.name}</div>
            </div>
            <span style="color:#facc15; font-weight:bold;">${u.xp || 0} XP</span>
        </div>
    `).join('');
}

// --- VIEW: STAFF ROSTER ---
async function renderStaffPage() {
    const main = document.getElementById('main-view');
    main.innerHTML = `
        <div class="page-header">
            <h1>Staff Roster</h1>
            <button class="btn-primary" style="width:auto;">+ Add Staff</button>
        </div>
        <div class="table-container">
            <table>
                <thead><tr><th>Identity</th><th>Rank</th><th>Performance</th><th>Status</th><th>Manage</th></tr></thead>
                <tbody id="staff-list"><tr><td colspan="5">Loading...</td></tr></tbody>
            </table>
        </div>`;

    const { data: staff } = await supabase.from('profiles').select('*, ranks(name, weight), departments(name, color_hex)').order('ranks(weight)', { ascending: false });

    document.getElementById('staff-list').innerHTML = staff.map(u => `
        <tr>
            <td>
                <div style="font-weight:600;">${u.full_name}</div>
                <div style="font-size:0.8rem; color:gray;">${u.phone || 'No Phone'}</div>
            </td>
            <td>
                <span style="color:${u.departments?.color_hex || 'white'}">${u.departments?.name || 'Unassigned'}</span>
                <div style="font-size:0.8rem; color:#e4e4e7;">${u.ranks?.name || 'Unranked'}</div>
            </td>
            <td>
                <span style="color:#facc15; font-weight:bold;">${u.xp || 0} XP</span>
            </td>
            <td><span class="status-badge status-${u.status}">${u.status}</span></td>
            <td>
                <button class="btn-primary" style="padding:6px 12px; font-size:0.8rem;" onclick="window.openManageModal('${u.id}')">Edit</button>
            </td>
        </tr>`).join('');
}

// --- VIEW: TASKS ---
async function renderTasksPage() {
    const main = document.getElementById('main-view');
    main.innerHTML = `
        <div class="page-header">
            <h1>Duty Tasks</h1>
            <button class="btn-primary" onclick="window.createTask()" style="width:auto;">+ Assign Task</button>
        </div>
        <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div>
                <h3 style="margin-bottom:10px;">Pending</h3>
                <div id="pending-tasks" style="display:flex; flex-direction:column; gap:10px;">Loading...</div>
            </div>
            <div>
                <h3 style="margin-bottom:10px;">Completed History</h3>
                <div id="completed-tasks" style="display:flex; flex-direction:column; gap:10px;">Loading...</div>
            </div>
        </div>`;
    loadTasks();
}

async function loadTasks() {
    const { data: tasks } = await supabase.from('tasks').select('*, profiles!assigned_to(full_name)').order('created_at', { ascending: false });
    
    const renderCard = (t) => `
        <div class="stat-card" style="padding:15px; border-left: 4px solid ${t.is_completed ? '#22c55e' : '#eab308'};">
            <div style="font-weight:bold;">${t.title}</div>
            <p style="color:gray; font-size:0.85rem; margin:5px 0;">${t.description || 'No description provided.'}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem;">
                <span style="color:#a1a1aa;">Assigned: ${t.profiles?.full_name || 'All Staff'}</span>
                ${!t.is_completed ? `<button onclick="window.completeTask(${t.id})" style="background:#22c55e; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Done</button>` : '<span>✅</span>'}
            </div>
        </div>`;

    document.getElementById('pending-tasks').innerHTML = tasks.filter(t => !t.is_completed).map(renderCard).join('') || '<div style="color:gray;">No pending tasks.</div>';
    document.getElementById('completed-tasks').innerHTML = tasks.filter(t => t.is_completed).map(renderCard).join('') || '<div style="color:gray;">No history.</div>';
}

window.completeTask = async (id) => {
    await supabase.from('tasks').update({ is_completed: true }).eq('id', id);
    loadTasks();
};

window.createTask = async () => {
    const title = prompt("Enter Task Title:");
    if(!title) return;
    await supabase.from('tasks').insert({ title: title, created_by: currentUser.id });
    loadTasks();
}

// --- MODAL: EDIT STAFF ---
window.openManageModal = async (userId) => {
    const modal = document.getElementById('modal-overlay');
    const { data: user } = await supabase.from('profiles').select('*').eq('id', userId).single();
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending: false});
    const { data: depts } = await supabase.from('departments').select('*');

    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <h3>Manage Staff</h3>
                <button onclick="document.getElementById('modal-overlay').style.display='none'" class="btn-icon"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="edit-id" value="${user.id}">
                <input type="hidden" id="old-rank" value="${user.rank_id}">
                
                <div class="input-group">
                    <label>Full Name</label>
                    <input type="text" id="edit-name" value="${user.full_name}">
                </div>
                
                <div class="input-group">
                    <label>Phone Number / Contact</label>
                    <input type="text" id="edit-phone" value="${user.phone || ''}">
                </div>

                <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                    <div class="input-group">
                        <label>Department</label>
                        <select id="edit-dept">${depts.map(d => `<option value="${d.id}" ${d.id==user.department_id?'selected':''}>${d.name}</option>`).join('')}</select>
                    </div>
                    <div class="input-group">
                        <label>Rank</label>
                        <select id="edit-rank">${ranks.map(r => `<option value="${r.id}" ${r.id==user.rank_id?'selected':''}>${r.name}</option>`).join('')}</select>
                    </div>
                </div>

                <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
                    <div class="input-group">
                        <label>XP Points</label>
                        <input type="number" id="edit-xp" value="${user.xp || 0}">
                    </div>
                    <div class="input-group">
                        <label>Status</label>
                        <select id="edit-status">
                            <option value="active" ${user.status=='active'?'selected':''}>Active Duty</option>
                            <option value="loa" ${user.status=='loa'?'selected':''}>LOA</option>
                            <option value="suspended" ${user.status=='suspended'?'selected':''}>Suspended</option>
                        </select>
                    </div>
                </div>

                <div id="reason-box" style="display:none; margin-top:15px; background:rgba(234, 179, 8, 0.1); border:1px solid #eab308; padding:10px; border-radius:6px;">
                    <label style="color:#eab308; font-size:0.8rem; font-weight:bold;">⚠️ RANK CHANGE REASON (REQUIRED)</label>
                    <input type="text" id="edit-reason" placeholder="Why is this staff being promoted/demoted?" style="margin-top:5px;">
                </div>

                <button id="save-btn" class="btn-primary" style="margin-top:20px;">Save Changes</button>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    lucide.createIcons();

    // Show reason box if rank changes
    const rankSelect = document.getElementById('edit-rank');
    rankSelect.addEventListener('change', () => {
        const oldRank = document.getElementById('old-rank').value;
        document.getElementById('reason-box').style.display = (rankSelect.value != oldRank) ? 'block' : 'none';
    });

    document.getElementById('save-btn').onclick = async () => {
        const userId = document.getElementById('edit-id').value;
        const newRank = rankSelect.value;
        const oldRank = document.getElementById('old-rank').value;
        const reason = document.getElementById('edit-reason').value;
        
        // Form Data
        const updates = {
            full_name: document.getElementById('edit-name').value,
            phone: document.getElementById('edit-phone').value,
            department_id: document.getElementById('edit-dept').value,
            rank_id: newRank,
            xp: document.getElementById('edit-xp').value,
            status: document.getElementById('edit-status').value
        };

        // Validate Reason
        if (newRank != oldRank && !reason) {
            alert("Please provide a reason for the promotion/demotion.");
            return;
        }

        // Save to Supabase
        await supabase.from('profiles').update(updates).eq('id', userId);

        // Audit Log
        if (newRank != oldRank) {
            await supabase.from('audit_logs').insert({
                actor_id: currentUser.id,
                target_id: userId,
                action: 'RANK_CHANGE',
                details: { reason, old: oldRank, new: newRank }
            });
            
            // Discord Webhook (Optional)
            if (DISCORD_WEBHOOK_URL) {
                fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ content: `🚨 **STAFF UPDATE**\nUser: ${updates.full_name}\nStatus: Rank Change\nReason: ${reason}` })
                });
            }
        }

        modal.style.display = 'none';
        renderStaffPage();
    };
};

window.addEventListener('hashchange', handleRouting);
init();
