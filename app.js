const CACHE_NAME = "cumeal-menu-v2";
const fields = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["snacksBoys", "Snacks (Boys)"],
  ["snacksGirls", "Snacks (Girls)"],
  ["dinner", "Dinner"]
];

let selectedSection = "menu";
const dateInput = document.querySelector("#date-select");

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date);
}

function render() {
  const showingTimings = selectedSection === "timings";
  const selectedDate = new Date(`${dateInput.value}T12:00:00`);
  document.querySelector("#date").textContent = showingTimings
    ? "Mess timings"
    : formatDate(selectedDate);
  document.querySelector("#menu").hidden = showingTimings;
  document.querySelector("#timings").hidden = !showingTimings;
  if (showingTimings) return;

  const menu = OCTOBER_MENU[dateInput.value];
  const container = document.querySelector("#menu");
  if (!menu) {
    container.innerHTML = `<p class="status">No menu has been published for this date.</p>`;
    return;
  }

  const rows = fields
    .filter(([key]) => typeof menu[key] === "string" && menu[key].trim())
    .map(([key, title]) => `
      <article class="meal">
        <h2 class="meal-name">${title.toUpperCase()}</h2>
        <p class="meal-value">${escapeHTML(menu[key].trim())}</p>
      </article>
    `).join("");
  container.innerHTML = rows || `<p class="status">No menu has been published for this date.</p>`;
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function loadMenus() {
  render();
}

document.querySelectorAll(".day-button").forEach(button => {
  button.addEventListener("click", () => {
    selectedSection = button.dataset.day;
    document.querySelectorAll(".day-button").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    loadMenus();
  });
});

function refreshApp() {
  const button = document.querySelector("#refresh");
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  window.location.reload();
}

const today = new Date();
const octoberDate = today.getFullYear() === 2026 && today.getMonth() === 9
  ? today.toISOString().slice(0, 10)
  : "2026-10-01";
dateInput.value = octoberDate;
dateInput.addEventListener("change", loadMenus);
document.querySelector("#refresh").addEventListener("click", refreshApp);
loadMenus();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
