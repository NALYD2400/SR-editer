(function () {
  window.getSRSupabase = function getSRSupabase() {
    if (window.__srSupabaseClient) return window.__srSupabaseClient;
    if (!window.supabase || !window.SR_CONFIG) return null;

    window.__srSupabaseClient = window.supabase.createClient(
      window.SR_CONFIG.supabaseUrl,
      window.SR_CONFIG.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
        },
      }
    );
    return window.__srSupabaseClient;
  };
})();
