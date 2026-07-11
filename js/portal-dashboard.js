const supabase = window.supabase.createClient(window.SR_CONFIG.supabaseUrl, window.SR_CONFIG.supabaseAnonKey);

const loadingEl = document.getElementById("loading");
const contentEl = document.getElementById("dashboard-content");
const userEmailEl = document.getElementById("user-email");
const userTierEl = document.getElementById("user-tier");
const manageBillingBtn = document.getElementById("manage-billing-btn");
const billingErrorEl = document.getElementById("billing-error");
const logoutBtn = document.getElementById("logout-btn");

let currentSession = null;

async function init() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    window.location.href = "login.html";
    return;
  }

  currentSession = session;
  userEmailEl.textContent = session.user.email;

  // Charger le profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("user_id", session.user.id)
    .single();

  if (profile) {
    const tier = profile.subscription_tier || "free";
    userTierEl.textContent = tier.toUpperCase();
    userTierEl.className = `tier-badge ${tier}`;
  }

  loadingEl.style.display = "none";
  contentEl.style.display = "block";
}

manageBillingBtn.addEventListener("click", async () => {
  manageBillingBtn.disabled = true;
  manageBillingBtn.textContent = "Redirection...";
  billingErrorEl.style.display = "none";

  try {
    const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
      body: { return_url: window.location.href },
    });

    if (error) throw error;
    if (data?.url) {
      window.location.href = data.url;
    } else {
      throw new Error("Lien de redirection introuvable.");
    }
  } catch (err) {
    console.error(err);
    billingErrorEl.textContent = "Impossible d'accéder au portail de facturation. Assurez-vous d'avoir un abonnement actif.";
    billingErrorEl.style.display = "block";
    manageBillingBtn.disabled = false;
    manageBillingBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> Gérer mon abonnement`;
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "login.html";
});

init();
