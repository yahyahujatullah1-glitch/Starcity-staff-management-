// Paste your keys here
const SUPABASE_URL = 'https://riluxnxxndwocrjuwzpd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbHV4bnh4bmR3b2NyanV3enBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwOTM1MDEsImV4cCI6MjA4MDY2OTUwMX0.xcLBQijXfbCB3dM1FH4uzo08IPs-trovOy6T_vdpc_o';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
