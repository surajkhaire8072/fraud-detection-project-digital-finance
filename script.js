const $ = (id) => document.getElementById(id);

let historyItems = [];
let nextId = 1001;

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0
}).format(value);

function calculateDemoRisk(amount, hour, frequency, international) {
  // Transparent heuristic for an educational demo; NOT a trained ML model.
  let score = 0.05;
  score += Math.min(amount / 100000, 1) * 0.35;
  score += (hour >= 0 && hour <= 4) ? 0.20 : 0;
  score += Math.min(frequency / 15, 1) * 0.25;
  score += international ? 0.20 : 0;
  return Math.max(0, Math.min(score, 0.99));
}

function currentThreshold() {
  return Number($("threshold").value) / 100;
}

function updateThresholdLabels() {
  const value = $("threshold").value + "%";
  $("thresholdValue").textContent = value;
  $("thresholdMetric").textContent = value;
}

function updateMetrics() {
  const total = historyItems.length;
  const flagged = historyItems.filter(item => item.flagged).length;
  $("totalCount").textContent = total;
  $("flaggedCount").textContent = flagged;
  $("reviewRate").textContent = total ? Math.round(flagged / total * 100) + "%" : "0%";
}

function renderHistory() {
  const body = $("historyBody");
  if (!historyItems.length) {
    body.innerHTML = '<tr class="empty-row"><td colspan="6">No transactions analyzed yet. Submit a sample transaction to get started.</td></tr>';
    return;
  }
  body.innerHTML = historyItems.map(item => `
    <tr>
      <td class="transaction-id">TX-${item.id}</td>
      <td>${money(item.amount)}</td>
      <td>${String(item.hour).padStart(2, "0")}:00</td>
      <td>${item.international ? "Yes" : "No"}</td>
      <td class="score-cell">${Math.round(item.score * 100)}%</td>
      <td><span class="status-badge ${item.flagged ? "flagged" : "clear"}">${item.flagged ? "Flag for review" : "Not flagged"}</span></td>
    </tr>`).join("");
}

function showResult(item) {
  const box = $("result");
  box.className = "result-box " + (item.flagged ? "flagged" : "clear");
  box.innerHTML = `
    <div class="result-top">
      <div class="result-title">${item.flagged ? "⚠ Flag for human review" : "✓ Not flagged by demo threshold"}</div>
      <div class="risk-number">${Math.round(item.score * 100)}%</div>
    </div>
    <div class="risk-bar"><span style="width:${Math.round(item.score * 100)}%"></span></div>
    <p>${item.flagged
      ? "This demo score is above the selected threshold. It is not proof of fraud; investigate using an approved review process."
      : "This demo score is below the selected threshold. A low score does not guarantee that a transaction is genuine."}</p>
    <p><b>Transaction:</b> TX-${item.id} · <b>Amount:</b> ${money(item.amount)}</p>`;
}

$("threshold").addEventListener("input", updateThresholdLabels);

$("transactionForm").addEventListener("submit", function (event) {
  event.preventDefault();
  const amount = Number($("amount").value);
  const hour = Number($("hour").value);
  const frequency = Number($("frequency").value);
  const international = $("international").value === "yes";

  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(frequency) || frequency < 0) {
    alert("Please enter valid non-negative transaction values.");
    return;
  }

  const score = calculateDemoRisk(amount, hour, frequency, international);
  const item = {
    id: nextId++,
    amount,
    hour,
    frequency,
    international,
    score,
    flagged: score >= currentThreshold(),
    createdAt: new Date().toISOString()
  };

  historyItems.unshift(item);
  historyItems = historyItems.slice(0, 100);
  showResult(item);
  renderHistory();
  updateMetrics();
});

$("clearHistory").addEventListener("click", function () {
  historyItems = [];
  renderHistory();
  updateMetrics();
  $("result").className = "result-box hidden";
});

updateThresholdLabels();
updateMetrics();
renderHistory();
