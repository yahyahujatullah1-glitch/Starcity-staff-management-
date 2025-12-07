import { supabase } from './config.js';

// --- GLOBAL ELEMENTS ---
const app = document.getElementById('app');
const loader = document.getElementById('global-loader');

// --- 1. INITIALIZATION (STARTUP) ---
async function init() {
    try {
        console.log("App initializing...");

        // Check if user is logged in
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        // Hide the loading spinner with a smooth fade
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
                app.style.display = 'block';
            }, 500);
        }

        // Route to correct page
        if (!session) {
            renderLogin();
        } else {
            handleRouting(session.user);
        }
    } catch (err) {
        console.error("Init Error:", err);
        alert("Failed to connect to system. Check console for details.");
    }
}

// --- 2. ROUTER (NAVIGATION) ---
function handleRouting(user) {
    // Determine which page to show based on URL hash (e.g., #staff)
    const hash = window.location.hash || '#dashboard';
    
    // Always render the layout first (Sidebar)
    renderLayout(user);

    // Load specific page content
    if (hash === '#staff') {
        renderStaffPage();
    } else if (hash === '#tasks') {
        renderTasksPage(); // Placeholder
    } else {
        renderDashboardPage(user);
    }

    // Update active link in sidebar
    updateSidebarActiveState(hash);

    // Listen for future navigation changes
    window.onhashchange = () => handleRouting(user);
}

function updateSidebarActiveState(hash) {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('href') === hash) el.classList.add('active');
    });
}

// --- 3. VIEW: LOGIN PAGE ---
function renderLogin() {
    app.innerHTML = `
        <div class="login-wrapper fade-in">
            <div class="login-box">
                <div class="login-header">
                    <i data-lucide="shield" style="width:40px; height:40px; color:#3b82f6; margin-bottom:10px;"></i>
                    <h2>StarCity Staff</h2>
                    <p>Restricted Access</p>
                </div>
                <form id="login-form">
                    <div class="input-group">
                        <label>Email Address</label>
                        <input type="email" id="email" placeholder="admin@starcity.com" required>
                    </div>
                    <div class="input-group">
                        <label>Password</label>
                        <input type="password" id="password" placeholder="••••••••" required>
                    </div>
                    <button type="submit" class="btn-primary">Secure Login</button>
                    <p id="login-error" style="color: #f87171; font-size: 0.85rem; margin-top: 15px; text-align: center; display: none;"></p>
                </form>
            </div>
        </div>
    `;
    lucide.createIcons();

    // Handle Form Submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        const errorMsg = document.getElementById('login-error');
        
        // Show loading state on button
        btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width:16px;"></i> Verifying...`;
        btn.disabled = true;
        errorMsg.style.display = 'none';

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            errorMsg.innerText = "Access Denied: " + error.message;
            errorMsg.style.display = 'block';
            btn.innerHTML = 'Secure Login';
            btn.disabled = false;
        } else {
            // Success: Reload to trigger init() again
            window.location.hash = '#dashboard';
            window.location.reload(); 
        }
    });
}

// --- 4. VIEW: MAIN LAYOUT (SIDEBAR) ---
function renderLayout(user) {
    // Only inject layout if it's not already there
    if (!document.getElementById('sidebar-layout')) {
        app.innerHTML = `
            <div id="sidebar-layout" class="dashboard-layout fade-in">
                <aside class="sidebar">
                    <div class="brand">
                        <i data-lucide="shield-check" style="color:#3b82f6"></i> STARCITY
                    </div>
                    <nav>
                        <a href="#dashboard" class="nav-item">
                            <i data-lucide="layout-dashboard"></i> Overview
                        </a>
                        <a href="#staff" class="nav-item">
                            <i data-lucide="users"></i> Staff Roster
                        </a>
                        <a href="#tasks" class="nav-item">
                            <i data-lucide="clipboard-list"></i> Assignments
                        </a>
                    </nav>
                    <div style="margin-top: auto;">
                        <div style="padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 10px;">
                            <div style="font-size: 0.75rem; color: gray; text-transform:uppercase; letter-spacing:1px;">User</div>
                            <div style="font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis;">${user.email}</div>
                        </div>
                        <button id="logout-btn" class="nav-item" style="width: 100%; border: none; background: transparent; cursor: pointer; color: #f87171;">
                            <i data-lucide="log-out"></i> Sign Out
                        </button>
                    </div>
                </aside>
                <main class="main-content" id="main-view"></main>
            </div>
        `;
        
        // Handle Logout
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    }
    lucide.createIcons();
}

// --- 5. VIEW: DASHBOARD STATS ---
function renderDashboardPage(user) {
    const main = document.getElementById('main-view');
    main.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h1>Command Center</h1>
                <button class="btn-primary" style="width: auto; padding: 10px 20px;">+ Quick Action</button>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">TOTAL STAFF</div>
                    <div class="stat-value">--</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">ONLINE NOW</div>
                    <div class="stat-value" style="color: #4ade80">--</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">PENDING TASKS</div>
                    <div class="stat-value" style="color: #facc15">--</div>
                </div>
            </div>

            <h3 style="margin-bottom: 15px; color: var(--text-muted);">Recent Audit Logs</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Action Type</th>
                            <th>Details</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td colspan="3" style="padding:20px; text-align:center; color:gray;">System logs coming soon...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// --- 6. VIEW: STAFF ROSTER ---
async function renderStaffPage() {
    const main = document.getElementById('main-view');
    main.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h1>Staff Roster</h1>
                <button class="btn-primary" style="width: auto; padding: 10px 20px;">+ Add Member</button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name / Callsign</th>
                            <th>Rank</th>
                            <th>Department</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="staff-list">
                        <tr><td colspan="4" style="text-align:center; padding:30px;">
                            <i data-lucide="loader-2" class="animate-spin"></i> Loading Database...
                        </td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    lucide.createIcons();

    // Fetch Data from Supabase
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
            full_name, 
            callsign, 
            status, 
            ranks (name, weight), 
            departments (name, color_hex)
        `)
        .order('ranks(weight)', { ascending: false }); // Sort by Highest Rank

    const tbody = document.getElementById('staff-list');

    if (error) {
        console.error("Fetch Error:", error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#f87171;">Error loading data. Check console.</td></tr>`;
        return;
    }

    if (!profiles || profiles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">No staff found in database.</td></tr>`;
        return;
    }

    // Render Rows
    tbody.innerHTML = profiles.map(staff => {
        const deptColor = staff.departments?.color_hex || '#71717a';
        return `
            <tr>
                <td>
                    <div style="font-weight:600; color:white;">${staff.full_name || 'Unknown'}</div>
                    <div style="font-size:0.8rem; color:gray;">${staff.callsign || 'No Callsign'}</div>
                </td>
                <td>
                    <span style="color:#e4e4e7;">${staff.ranks?.name || 'Unranked'}</span>
                </td>
                <td>
                    <span class="status-badge" style="background: ${deptColor}30; color: ${deptColor}; border:1px solid ${deptColor}50;">
                        ${staff.departments?.name || 'General'}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${staff.status}">${staff.status.toUpperCase()}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// --- 7. VIEW: TASKS (Placeholder) ---
function renderTasksPage() {
    const main = document.getElementById('main-view');
    main.innerHTML = `
        <div class="fade-in">
            <div class="page-header"><h1>Assignments</h1></div>
            <div class="table-container" style="padding:40px; text-align:center; color:gray;">
                <i data-lucide="wrench" style="width:48px; height:48px; margin-bottom:10px;"></i>
                <p>Task Management Module is under construction.</p>
            </div>
        </div>
    `;
    lucide.createIcons();
}

// --- START APP ---
init();
