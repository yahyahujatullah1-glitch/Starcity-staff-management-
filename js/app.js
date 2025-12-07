// js/app.js
import { supabase } from './config.js';
import { login, logout, getUser } from './auth.js';
import { LoginView, DashboardView, StaffView } from './views.js';

const app = document.getElementById('app');

// 1. ROUTER
async function router() {
    const user = await getUser();
    const hash = window.location.hash;

    // Redirect to login if not authenticated
    if (!user) {
        renderLogin();
        return;
    }

    // Routing Logic
    if (hash === '#staff') {
        renderStaff();
    } else if (hash === '#dashboard' || hash === '') {
        renderDashboard(user);
    } else {
        renderDashboard(user);
    }
}

// 2. RENDER FUNCTIONS

function renderLogin() {
    app.innerHTML = LoginView;
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            await login(email, password);
            window.location.hash = '#dashboard';
            router();
        } catch (err) {
            document.getElementById('error-msg').innerText = err.message;
        }
    });
}

function renderDashboard(user) {
    app.innerHTML = DashboardView;
    setupSidebarEvents();
    lucide.createIcons(); // Refresh icons
}

async function renderStaff() {
    app.innerHTML = StaffView;
    setupSidebarEvents();
    lucide.createIcons();

    // Fetch Real Data from Supabase
    const tbody = document.getElementById('staff-table-body');
    
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*, ranks(name), departments(name, color_hex)')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:red">Error loading staff</td></tr>`;
        return;
    }

    if (profiles.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">No staff found.</td></tr>`;
    } else {
        tbody.innerHTML = profiles.map(staff => `
            <tr>
                <td>${staff.full_name || staff.email} <br> <small style="color:gray">${staff.callsign || ''}</small></td>
                <td>${staff.ranks?.name || 'Unranked'}</td>
                <td><span class="badge" style="background:${staff.status === 'active' ? '#14532d' : '#7f1d1d'}">${staff.status}</span></td>
                <td>${new Date(staff.joined_at || Date.now()).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }
}

// 3. EVENT HELPERS
function setupSidebarEvents() {
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Highlight active link
    const hash = window.location.hash || '#dashboard';
    document.querySelectorAll('.nav-link').forEach(link => {
        if(link.getAttribute('href') === hash) link.classList.add('active');
    });
}

// 4. INIT
window.addEventListener('hashchange', router);
router();
