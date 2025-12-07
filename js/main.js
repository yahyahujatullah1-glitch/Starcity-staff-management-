import { supabase } from './config.js';
import { initUserView } from './user.js';
import { initAdminView } from './admin.js';

const app = document.getElementById('app');
const loader = document.getElementById('loader');

async function init() {
    // 1. Mobile Menu Logic (Run Immediately)
    setupMobileMenu();

    // 2. Auth Check
    const { data: { session } } = await supabase.auth.getSession();
    
    loader.style.display = 'none';

    if (!session) {
        renderLogin();
    } else {
        // Init View
        initUserView(session.user);
        checkAdminAccess(session.user.id);
    }
}

function setupMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    // Delegate event listener to handle potential dynamic classes
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        
        // Open/Close on Button Click
        if (e.target.closest('#mobile-menu-btn')) {
            sidebar.classList.toggle('open');
        }

        // Close when clicking outside (Overlay effect)
        if (sidebar && sidebar.classList.contains('open') && 
            !e.target.closest('.sidebar') && 
            !e.target.closest('#mobile-menu-btn')) {
            sidebar.classList.remove('open');
        }
    });
}

async function checkAdminAccess(uid) {
    const { data: user } = await supabase.from('profiles').select('ranks(weight)').eq('id', uid).single();
    if (user?.ranks?.weight >= 90) {
        const nav = document.querySelector('.nav');
        if(nav) {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'nav-btn';
            adminBtn.style.color = '#ef4444';
            adminBtn.innerHTML = '<i data-lucide="shield-alert"></i> Admin Panel';
            adminBtn.onclick = () => {
                initAdminView({ id: uid });
                // Close sidebar on mobile when switching
                document.querySelector('.sidebar').classList.remove('open');
            };
            nav.appendChild(adminBtn);
            lucide.createIcons();
        }
    }
}

function renderLogin() {
    // Hide mobile button on login screen
    document.getElementById('mobile-menu-btn').style.display = 'none';

    app.innerHTML = `
        <div style="height:100vh; display:flex; justify-content:center; align-items:center; padding:20px;">
            <div class="modal-box" style="width:100%; max-width:400px;">
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
