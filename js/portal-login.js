const supabase = window.supabase.createClient(window.SR_CONFIG.supabaseUrl, window.SR_CONFIG.supabaseAnonKey);

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const discordBtn = document.getElementById("discord-btn");
const errorMessage = document.getElementById("error-message");

// Rediriger si déjà connecté
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    window.location.href = "dashboard.html";
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMessage.style.display = "none";
  submitBtn.disabled = true;
  submitBtn.textContent = "Connexion...";

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput.value.trim(),
    password: passwordInput.value,
  });

  if (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Se connecter";
  } else {
    window.location.href = "dashboard.html";
  }
});

discordBtn.addEventListener("click", async () => {
  discordBtn.disabled = true;
  errorMessage.style.display = "none";
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: window.location.origin + "/dashboard.html",
    },
  });

  if (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
    discordBtn.disabled = false;
  }
});
