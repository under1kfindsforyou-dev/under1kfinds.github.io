/* =========================================================
   SUPABASE-CONFIG.JS
   ---------------------------------------------------------
   Paste your project's URL and anon (public) key below.
   Find both in your Supabase project: Settings → API.

   IMPORTANT: the "anon public" key is SAFE to put in frontend
   code — it's designed to be public. It cannot bypass the
   security rules (Row Level Security policies) you set up in
   Supabase. Never paste your "service_role" key anywhere in
   this project — that one must stay private.
   ========================================================= */

const SUPABASE_URL = "https://yqhkjvlwydvjqsghrkok.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxaGtqdmx3eWR2anFzZ2hya29rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MjQ5NjMsImV4cCI6MjEwMjQwMDk2M30.7wJNXKLsgeGXEb5UtxbRh-0lqwXF__AVi2XA1FPpYaw";

// Named `sb` (not `supabase`) so it doesn't clash with the
// `supabase` global that the Supabase library itself creates.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
