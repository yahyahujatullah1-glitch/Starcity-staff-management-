import { supabase } from './config.js';

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
    else renderDashboardPage();
}

// --- LOGIN ---
function renderLogin() {
    app.innerHTML = `
        <div class="login-wrapper">
            <div class="login-box">
                <h2 style="text-align:center; margin-bottom:20px;">Staff Access</h2>
                <form id="login-form">
                    <input type="email" id="email" placeholder="Email" required style="margin-bottom:10px; width:100%; padding:10px;">
                    <input type="password" id="password" placeholder="Password" required style="margin-bottom:10px; width:100%; padding:10px;">
                    <button class="btn-primary">Login</button>
                </form>
            </div>
        </div>`;
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) alert(error.message);
        else window.location.reload();
    });
}

// --- LAYOUT ---
function renderLayout(user) {
    if (document.getElementById('sidebar')) return;
    app.innerHTML = `
        <div class="dashboard-layout">
            <aside id="sidebar" class="sidebar">
                <div class="brand"><i data-lucide="shield"></i> STARCITY</div>
                <nav>
                    <a href="#dashboard" class="nav-item"><i data-lucide="layout-dashboard"></i> Dashboard</a>
                    <a href="#staff" class="nav-item"><i data-lucide="users"></i> Staff Roster</a>
                </nav>
                <button id="logout-btn" style="margin-top:auto; background:none; border:none; color:red; cursor:pointer;">Logout</button>
            </aside>
            <main id="main-view" class="main-content"></main>
        </div>`;
    
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
    });
    lucide.createIcons();
}

// --- DASHBOARD ---
async function renderDashboardPage() {
    const main = document.getElementById('main-view');
    // Fetch Stats
    const { count: staffCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: activeCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active');
    
    main.innerHTML = `
        <div class="page-header"><h1>Dashboard</h1></div>
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Total Staff</div><div class="stat-value">${staffCount || 0}</div></div>
            <div class="stat-card"><div class="stat-label">Active Duty</div><div class="stat-value" style="color:#4ade80">${activeCount || 0}</div></div>
        </div>
        <h3>Recent Audit Logs</h3>
        <div class="table-container">
            <table><thead><tr><th>Action</th><th>Target</th><th>Date</th></tr></thead><tbody id="audit-list"></tbody></table>
        </div>`;

    // Fetch Logs
    const { data: logs } = await supabase.from('audit_logs').select('action, created_at, target:profiles!target_id(full_name)').order('created_at', { ascending: false }).limit(5);
    const tbody = document.getElementById('audit-list');
    if(logs) {
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${log.action}</td>
                <td>${log.target?.full_name || 'Unknown'}</td>
                <td>${new Date(log.created_at).toLocaleDateString()}</td>
            </tr>`).join('');
    }
}

// --- STAFF ROSTER (FUNCTIONAL) ---
async function renderStaffPage() {
    const main = document.getElementById('main-view');
    main.innerHTML = `
        <div class="page-header"><h1>Staff Roster</h1></div>
        <div class="table-container">
            <table>
                <thead><tr><th>Name</th><th>Rank</th><th>Dept</th><th>Status</th><th>Action</th></tr></thead>
                <tbody id="staff-list"><tr><td colspan="5">Loading...</td></tr></tbody>
            </table>
        </div>`;

    const { data: staff } = await supabase.from('profiles').select('*, ranks(name, weight), departments(name, color_hex)').order('ranks(weight)', { ascending: false });

    const tbody = document.getElementById('staff-list');
    tbody.innerHTML = staff.map(u => `
        <tr>
            <td>${u.full_name}<br><small>${u.callsign || ''}</small></td>
            <td>${u.ranks?.name || '-'}</td>
            <td><span style="color:${u.departments?.color_hex || 'white'}">${u.departments?.name || '-'}</span></td>
            <td><span class="status-badge status-${u.status}">${u.status}</span></td>
            <td><button class="btn-primary" style="padding:5px 10px; font-size:0.8rem;" onclick="window.openEditModal('${u.id}')">Manage</button></td>
        </tr>`).join('');
    
    lucide.createIcons();
}

// --- EDIT MODAL LOGIC (THE MAGIC) ---
window.openEditModal = async (userId) => {
    const modal = document.getElementById('modal-overlay');
    const { data: user } = await supabase.from('profiles').select('*').eq('id', userId).single();
    const { data: depts } = await supabase.from('departments').select('*');
    const { data: ranks } = await supabase.from('ranks').select('*').order('weight', {ascending: false});

    // Populate Fields
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-name').value = user.full_name;
    document.getElementById('edit-status').value = user.status;

    // Populate Dropdowns
    const deptSelect = document.getElementById('edit-dept');
    deptSelect.innerHTML = depts.map(d => `<option value="${d.id}" ${user.department_id === d.id ? 'selected' : ''}>${d.name}</option>`).join('');

    const rankSelect = document.getElementById('edit-rank');
    rankSelect.innerHTML = ranks.map(r => `<option value="${r.id}" ${user.rank_id === r.id ? 'selected' : ''}>${r.name}</option>`).join('');

    // Show Modal
    modal.style.display = 'flex';
    modal.style.opacity = '1';
};

// Close Modal Logic
document.getElementById('close-modal').onclick = () => {
    document.getElementById('modal-overlay').style.display = 'none';
};

// SAVE CHANGES
document.getElementById('save-user-btn').onclick = async () => {
    const btn = document.getElementById('save-user-btn');
    btn.innerText = 'Saving...';
    
    const userId = document.getElementById('edit-user-id').value;
    const name = document.getElementById('edit-name').value;
    const deptId = document.getElementById('edit-dept').value;
    const rankId = document.getElementById('edit-rank').value;
    const status = document.getElementById('edit-status').value;

    // 1. Update Profile
    const { error } = await supabase.from('profiles').update({
        full_name: name,
        department_id: deptId,
        rank_id: rankId,
        status: status
    }).eq('id', userId);

    if (error) {
        alert('Error updating: ' + error.message);
    } else {
        // 2. Create Audit Log
        await supabase.from('audit_logs').insert({
            actor_id: currentUser.id,
            target_id: userId,
            action: 'UPDATE_PROFILE',
            details: { new_rank: rankId, new_status: status }
        });
        
        // 3. Refresh
        document.getElementById('modal-overlay').style.display = 'none';
        renderStaffPage();
    }
    btn.innerText = 'Save Changes';
};

window.addEventListener('hashchange', handleRouting);
init();
