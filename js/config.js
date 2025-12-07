// js/config.js
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// Initialize Supabase Client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
