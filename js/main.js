import { supabase } from './config.js';
import { initUserView } from './user.js';
import { initAdminView } from './admin.js';

const app = document.getElementById('app');
const loader = document.getElementById('loader');

async function init() {
    setupMobileMenu();
    const { data: { session } } = await supabase.auth.getSession();
    loader.style.display = 'none';

    if (!session) {
        renderLogin();
    } else {
        initUserView(session.user);
        checkAdminAccess(session.user.id);
    }
}

function setupMobileMenu() {
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-overlay');
        const btn = document.getElementById('mobile-menu-btn');
        
        // OPEN
        if (btn && e.target.closest('#mobile-menu-btn')) {
            sidebar.classList.add('open');
            if(overlay) overlay.classList.remove('hidden');
        }

        // CLOSE (Click Overlay)
        if (overlay && !overlay.classList.contains('hidden') && e.target === overlay) {
            sidebar.classList.remove('open');
            overlay.classList.add('hidden');
        }
    });
}

async function checkAdminAccess(uid) {
    const { data: user } = await supabase.from('profiles').select('ranks(weight)').eq('id', uid).single();
    if (user?.ranks?.weight >= 90) {
        const nav = document.querySelector('.nav-container');
        if(nav) {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-200 mt-2';
            adminBtn.innerHTML = '<i data-lucide="shield-alert" class="w-5 h-5"></i> <span>ADMIN PANEL</span>';
            adminBtn.onclick = () => {
                initAdminView({ id: uid });
                document.querySelector('.sidebar').classList.remove('open');
                document.getElementById('mobile-overlay').classList.add('hidden');
            };
            nav.appendChild(adminBtn);
            lucide.createIcons();
        }
    }
}

function renderLogin() {
    document.getElementById('mobile-menu-btn').style.display = 'none';

    app.innerHTML = `
        <div class="h-full flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
            <div class="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>
            <div class="relative w-full max-w-sm bg-[#121215] border border-gray-800 p-8 rounded-2xl shadow-2xl animate-fade-in">
                <div class="flex flex-col items-center mb-8">
                    <div class="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mb-4 border border-blue-600/50 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                        <i data-lucide="shield" class="w-8 h-8"></i>
                    </div>
                    <h2 class="text-3xl font-bold text-white tracking-widest" style="font-family:'Rajdhani'">STARCITY</h2>
                    <p class="text-gray-400 text-sm tracking-wide">SECURE ACCESS</p>
                </div>
                <form id="login-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Identify</label>
                        <input id="email" type="email" required class="w-full bg-black/50 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all placeholder-gray-600">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auth Key</label>
                        <input id="password" type="password" required class="w-full bg-black/50 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-blue-500 transition-all placeholder-gray-600">
                    </div>
                    <button class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-600/20 transition-all duration-200">INITIALIZE UPLINK</button>
                </form>
            </div>
        </div>
    `;
    lucide.createIcons();
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
