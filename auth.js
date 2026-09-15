import { supabase } from "./supabaseClient.js";

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const errorBox = document.getElementById("error-box");

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

// Redirect to dashboard if already logged in
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) window.location.href = "dashboard.html";
})();

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showError(error.message);
    return;
  }
  window.location.href = "dashboard.html";
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.hidden = true;
  const fullName = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    showError(error.message);
    return;
  }

  // New accounts start as Requester / Viewer.
  // An Administrator can change the role later from the Users page.
  const userId = data.user?.id;
  if (userId) {
    await supabase.from("profiles").insert({
      id: userId,
      full_name: fullName,
      role: "requester",
    });
  }

  alert("Account created. You can now log in.");
  signupForm.reset();
  document.getElementById("show-login").click();
});

document.getElementById("show-signup").addEventListener("click", () => {
  loginForm.hidden = true;
  signupForm.hidden = false;
});
document.getElementById("show-login").addEventListener("click", () => {
  signupForm.hidden = true;
  loginForm.hidden = false;
});
