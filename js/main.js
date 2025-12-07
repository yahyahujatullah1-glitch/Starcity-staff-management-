import { supabase } from './config.js';
import { initUserView } from './user.js';
import { initAdminView } from './admin.js';

const app = document.getElementById('app');
const loader = document.getElementById('loader');

// --- STARTUP ---
async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    
    loader.style.display = 'none';

    if (!session) {
        renderLogin();
    } else {
        // Logged in! Load User View by default
        initUserView(session.user);
        
        // Add "Admin Panel" button if user is special (Example check)
        checkAdminAccess(session.user.id);
    }
}

async function checkAdminAccess(uid) {
    // Check if user has high rank
    const { data: user } = await supabase.from('profiles').select('ranks(weight)').eq('id', uid).single();
    if (user?.ranks?.weight >= 90) { // Assuming 90+ is admin
        const nav = document.querySelector('.nav');
        if(nav) {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'nav-btn';
            adminBtn.style.color = '#ef4444';
            adminBtn.innerHTML = '<i data-lucide="shield-alert"></i> Switch to Admin Panel';
            adminBtn.onclick = () => initAdminView({ id: uid });
            nav.appendChild(adminBtn);
            lucide.createIcons();
        }
    }
}

function renderLogin() {
    app.innerHTML = `
        <div style="height:100vh; display:flex; justify-content:center; align-items:center;">
            <div class="modal-box">
                <h2 style="text-align:center; margin-bottom:20px;">Staff Portal</h2>
                <form id="login-form">
                    <label>Email</label>
                    <input id="email" type="email" required>
                    <label style="margin-top:10px;">Password</label>
                    <input id="password" type="password" required>
                    <button class="btn btn-primary" style="width:100%; margin-top:20px;">Login</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('login-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if(error) alert(error.message);
        else window.location.reload();
    }
}

init();

// Add Mobile Menu Toggle Logic
const mobileBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.querySelector('.sidebar');

if(mobileBtn) {
    mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if(window.innerWidth <= 768 && 
           !sidebar.contains(e.target) && 
           !mobileBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}
