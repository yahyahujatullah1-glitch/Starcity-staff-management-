// js/auth.js
import { supabase } from './config.js';

export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
}

export async function logout() {
    await supabase.auth.signOut();
    window.location.hash = '';
    window.location.reload();
}

export async function getUser() {
    const { data } = await supabase.auth.getSession();
    return data.session?.user || null;
}
