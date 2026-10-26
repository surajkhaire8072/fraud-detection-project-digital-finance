/*
 * FraudGuard Supabase integration.
 * Replace SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY with your own values.
 * A publishable key is intended for browser use; NEVER paste a secret/service_role key here.
 */
const SUPABASE_URL = "https://fmzqgytejetgtikjhfoe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_PIB1E4_JKP2QZz5QN_JQ8w_tlVlPgkz";

let client = null;
let authMode = "signin";

const $ = (id) => document.getElementById(id);
const setMessage = (id, message, type = "") => {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.className = `message ${type}`.trim();
};
const isConfigured = () =>
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR_PROJECT_REF") &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_") &&
  !SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE");

function setConnection(text, state = "neutral") {
  const badge = $("connectionBadge");
  badge.textContent = text;
  badge.className = `badge ${state}`;
}
function showApp(session) {
  $("authPanel").classList.toggle("hidden", Boolean(session));
  $("appPanel").classList.toggle("hidden", !session);
  $("signOutBtn").classList.toggle("hidden", !session);
  $("userLabel").textContent = session?.user?.email || "";
}
function setBusy(button, busy, label) {
  button.disabled = busy;
  if (busy) {
    button.dataset.oldLabel = button.textContent;
    button.textContent = label;
  } else {
    button.textContent = button.dataset.oldLabel || label;
  }
}

async function init() {
  if (!window.supabase?.createClient) {
    setConnection("Supabase library failed", "bad");
    setMessage("authMessage", "Could not load Supabase JS. Check your internet connection and reload.", "error");
    return;
  }
  if (!isConfigured()) {
    $("setupNotice").classList.remove("hidden");
    setConnection("Add project keys", "bad");
    showApp(null);
    return;
  }
  $("setupNotice").classList.add("hidden");
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  setConnection("Connecting…");
  const { data, error } = await client.auth.getSession();
  if (error) {
    setConnection("Connection error", "bad");
    setMessage("authMessage", error.message, "error");
    return;
  }
  setConnection("Supabase connected", "good");
  showApp(data.session);
  client.auth.onAuthStateChange((_event, session) => {
    showApp(session);
    if (session) loadHistory();
  });
  if (data.session) await loadHistory();
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    authMode = button.dataset.mode;
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    $("authSubmit").textContent = authMode === "signin" ? "Sign in" : "Create account";
    $("password").autocomplete = authMode === "signin" ? "current-password" : "new-password";
    setMessage("authMessage", "");
  });
});

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) {
    setMessage("authMessage", "First add your Supabase URL and publishable key in script.js, then commit the file.", "error");
    return;
  }
  const button = $("authSubmit");
  setBusy(button, true, authMode === "signin" ? "Signing in…" : "Creating account…");
  setMessage("authMessage", "");
  const email = $("email").value.trim();
  const password = $("password").value;
  try {
    let result;
    if (authMode === "signup") {
      result = await client.auth.signUp({ email, password });
      if (!result.error && !result.data.session) {
        setMessage("authMessage", "Account created. Check your email to confirm it, then sign in.", "success");
      }
    } else {
      result = await client.auth.signInWithPassword({ email, password });
    }
    if (result.error) setMessage("authMessage", result.error.message, "error");
    else if (authMode === "signin") setMessage("authMessage", "Signed in successfully.", "success");
  } catch (error) {
    setMessage("authMessage", error.message || "Authentication failed.", "error");
  } finally {
    setBusy(button, false, authMode === "signin" ? "Sign in" : "Create account");
  }
});

$("signOutBtn").addEventListener("click", async () => {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) setMessage("historyMessage", error.message, "error");
  else {
    showApp(null);
    setConnection("Signed out", "neutral");
  }
});

$("threshold").addEventListener("input", () => {
  $("thresholdLabel").textContent = `${$("threshold").value}%`;
});

function calculateDemoRisk({ amount, hour, frequency, international }) {
  let score = 0.05;
  score += Math.min(amount / 100000, 1) * 0.35;
  score += hour <= 4 ? 0.20 : 0;
  score += Math.min(frequency / 15, 1) * 0.25;
  score += international ? 0.20 : 0;
  return Math.min(0.99, Math.max(0, score));
}

$("transactionForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!client) {
    setMessage("authMessage", "Configure Supabase URL and publishable key in script.js first.", "error");
    return;
  }
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    setMessage("historyMessage", "Please sign in before saving transactions.", "error");
    showApp(null);
    return;
  }

  const amount = Number($("amount").value);
  const hour = Number($("hour").value);
  const frequency = Number($("frequency").value);
  const international = $("international").checked;
  const threshold = Number($("threshold").value) / 100;
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000000 ||
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(frequency) || frequency < 0 || frequency > 100) {
    setMessage("historyMessage", "Please enter valid transaction values.", "error");
    return;
  }

  const button = $("analyseBtn");
  setBusy(button, true, "Analysing & saving…");
  setMessage("historyMessage", "");
  try {
    // Server-side Edge Function is used when deployed; fallback is an explicitly-labelled demo formula.
    let score;
    let flagged;
    let scoringMethod = "browser-demo";
    const { data: serverResult, error: functionError } = await client.functions.invoke("score-transaction", {
      body: { amount, hour, frequency, international, threshold }
    });
    if (!functionError && Number.isFinite(Number(serverResult?.risk_score))) {
      score = Number(serverResult.risk_score);
      flagged = Boolean(serverResult.flagged);
      scoringMethod = "edge-function";
    } else {
      score = calculateDemoRisk({ amount, hour, frequency, international });
      flagged = score >= threshold;
    }

    const row = {
      user_id: user.id,
      amount,
      transaction_hour: hour,
      transactions_last_hour: frequency,
      international,
      risk_score: score,
      review_threshold: threshold,
      flagged
    };
    const { error: insertError } = await client.from("transactions").insert(row);
    if (insertError) throw insertError;

    const box = $("resultBox");
    box.classList.remove("hidden", "flagged");
    if (flagged) box.classList.add("flagged");
    box.innerHTML = `<h3>${flagged ? "⚠ Flagged for review" : "✓ Below review threshold"}</h3>
      <div class="result-number">${Math.round(score * 100)}%</div>
      <p>Illustrative risk score. Method: ${scoringMethod === "edge-function" ? "Supabase Edge Function" : "browser fallback demo"}. This is not a validated probability of fraud.</p>`;
    setMessage("historyMessage", "Transaction analysed and saved to Supabase.", "success");
    await loadHistory();
  } catch (error) {
    setMessage("historyMessage", `Could not save transaction: ${error.message || "Unknown error"}. Confirm schema.sql ran and RLS policies exist.`, "error");
  } finally {
    setBusy(button, false, "Analyse & save transaction");
  }
});

$("refreshBtn").addEventListener("click", loadHistory);

async function loadHistory() {
  if (!client) return;
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) return;
  $("historyBody").innerHTML = '<tr><td colspan="4" class="empty">Loading…</td></tr>';
  const { data, error } = await client
    .from("transactions")
    .select("id, amount, risk_score, flagged, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    $("historyBody").innerHTML = '<tr><td colspan="4" class="empty">Unable to load records.</td></tr>';
    setMessage("historyMessage", error.message, "error");
    return;
  }
  const rows = data || [];
  $("totalStat").textContent = rows.length;
  $("flaggedStat").textContent = rows.filter((row) => row.flagged).length;
  const average = rows.length ? rows.reduce((sum, row) => sum + Number(row.risk_score), 0) / rows.length : 0;
  $("avgStat").textContent = `${Math.round(average * 100)}%`;

  if (!rows.length) {
    $("historyBody").innerHTML = '<tr><td colspan="4" class="empty">No saved transactions yet. Analyse one to get started.</td></tr>';
    return;
  }
  $("historyBody").innerHTML = rows.map((row) => {
    const date = new Date(row.created_at).toLocaleString();
    const amount = Number(row.amount).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
    return `<tr>
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(amount)}</td>
      <td>${Math.round(Number(row.risk_score) * 100)}%</td>
      <td><span class="status ${row.flagged ? "flag" : "clear"}">${row.flagged ? "REVIEW" : "CLEAR"}</span></td>
    </tr>`;
  }).join("");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

init();
