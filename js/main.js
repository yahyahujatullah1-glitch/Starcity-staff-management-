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
        const btn = document.getElementById('mobile-menu-btn');
        
        if (btn && e.target.closest('#mobile-menu-btn')) {
            sidebar.classList.toggle('open');
        }

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
        const nav = document.querySelector('.nav-container');
        if(nav) {
            const adminBtn = document.createElement('button');
            adminBtn.className = 'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-danger bg-danger/10 border border-danger/20 rounded-lg hover:bg-danger hover:text-white transition-all duration-200 mt-2';
            adminBtn.innerHTML = '<i data-lucide="shield-alert" class="w-5 h-5"></i> <span>ADMIN PANEL</span>';
            adminBtn.onclick = () => {
                initAdminView({ id: uid });
                document.querySelector('.sidebar').classList.remove('open');
            };
            nav.appendChild(adminBtn);
            lucide.createIcons();
        }
    }
}

function renderLogin() {
    // Hide mobile button on login
    document.getElementById('mobile-menu-btn').style.display = 'none';

    app.innerHTML = `
        <div class="h-full flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center relative">
            <!-- Dark Overlay -->
            <div class="absolute inset-0 bg-dark/90 backdrop-blur-sm"></div>

            <div class="relative w-full max-w-sm bg-panel border border-border p-8 rounded-2xl shadow-2xl animate-fade-in">
                <div class="flex flex-col items-center mb-8">
                    <div class="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 border border-primary/50 text-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                        <i data-lucide="shield" class="w-8 h-8"></i>
                    </div>
                    <h2 class="text-3xl font-heading font-bold text-white tracking-widest">STARCITY</h2>
                    <p class="text-gray-400 text-sm tracking-wide">SECURE STAFF ACCESS</p>
                </div>

                <form id="login-form" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Identify</label>
                        <input id="email" type="email" required placeholder="name@starcity.com" 
                            class="w-full bg-dark/50 border border-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-gray-600">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auth Key</label>
                        <input id="password" type="password" required placeholder="••••••••" 
                            class="w-full bg-dark/50 border border-border text-white px-4 py-3 rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder-gray-600">
                    </div>
                    
                    <button class="w-full bg-primary hover:bg-primary-hover text-white font-heading font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all duration-200 transform hover:-translate-y-0.5 btn-glow">
                        INITIALIZE UPLINK
                    </button>
                </form>
                
                <div class="mt-6 text-center text-xs text-gray-600">
                    RESTRICTED SYSTEM • UNAUTHORIZED ACCESS IS LOGGED
                </div>
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
