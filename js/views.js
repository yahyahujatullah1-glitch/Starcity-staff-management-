// js/views.js

export const LoginView = `
    <div class="login-container">
        <div class="login-box">
            <h2 style="margin-bottom:20px; text-align:center;">Staff Portal</h2>
            <form id="login-form">
                <input type="email" id="email" placeholder="Email Address" required>
                <input type="password" id="password" placeholder="Password" required>
                <button type="submit">Secure Login</button>
            </form>
            <p id="error-msg" style="color:red; margin-top:10px; text-align:center;"></p>
        </div>
    </div>
`;

export const Sidebar = `
    <div class="sidebar">
        <div class="brand">
            <i data-lucide="shield"></i> STAFF SYS
        </div>
        <nav>
            <a href="#dashboard" class="nav-link"><i data-lucide="layout-dashboard"></i> Dashboard</a>
            <a href="#staff" class="nav-link"><i data-lucide="users"></i> Staff Roster</a>
            <a href="#tasks" class="nav-link"><i data-lucide="briefcase"></i> Tasks</a>
        </nav>
        <div style="margin-top:auto;">
            <button id="logout-btn" style="background:transparent; border:1px solid var(--border); color:var(--text-muted);">Log Out</button>
        </div>
    </div>
`;

export const DashboardView = `
    <div class="app-container">
        ${Sidebar}
        <div class="main-content">
            <div class="header">
                <h1>Command Center</h1>
                <div id="user-info">Welcome, Staff</div>
            </div>
            
            <div class="card-grid">
                <div class="card">
                    <h3>Total Staff</h3>
                    <div class="stat-num">124</div>
                </div>
                <div class="card">
                    <h3>Active Duty</h3>
                    <div class="stat-num" style="color: var(--success)">42</div>
                </div>
                <div class="card">
                    <h3>Pending Requests</h3>
                    <div class="stat-num" style="color: var(--warning)">8</div>
                </div>
            </div>

            <h2 style="margin-top:40px; margin-bottom:20px;">Recent Audit Logs</h2>
            <div class="card">
                <div style="padding:10px; border-bottom:1px solid var(--border);">
                    <b>Admin John</b> promoted <b>Officer Mike</b> <span style="float:right; color:gray;">2m ago</span>
                </div>
                <div style="padding:10px;">
                    <b>Sarah</b> submitted a LOA request <span style="float:right; color:gray;">1h ago</span>
                </div>
            </div>
        </div>
    </div>
`;

export const StaffView = `
    <div class="app-container">
        ${Sidebar}
        <div class="main-content">
            <div class="header">
                <h1>Staff Roster</h1>
                <button style="width:auto; padding:10px 20px;">+ Add Staff</button>
            </div>
            
            <div class="card">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Rank</th>
                            <th>Status</th>
                            <th>Joined</th>
                        </tr>
                    </thead>
                    <tbody id="staff-table-body">
                        <tr><td colspan="4">Loading data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
`;
