const CACHE_NAME = "cumeal-menu-v2";
const DATABASE_URL = "https://cumeal-4090b-default-rtdb.firebaseio.com/menu";
const fields = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["snacksBoys", "Snacks (Boys)"],
  ["snacksGirls", "Snacks (Girls)"],
  ["dinner", "Dinner"],
  ["dinnerSouth", "South Indian Dinner"]
];

let selectedSection = "today";
const dateInput = document.querySelector("#date-select");

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date);
}

function firebaseMenuURL(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  const month = date.toLocaleString("en-US", { month: "long" });
  return `${DATABASE_URL}/${date.getFullYear()}/${month}/${date.getDate()}.json`;
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

  const menu = currentMenu;
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

let currentMenu = null;

function fallbackMenu(dateValue) {
  return OCTOBER_MENU[dateValue]
    ? { ...OCTOBER_MENU[dateValue], dinnerSouth: SOUTH_INDIAN_DINNER[dateValue] }
    : null;
}

async function loadMenu() {
  if (selectedSection === "timings") {
    render();
    return;
  }

  document.querySelector("#menu").innerHTML = `<p class="status">Loading menu…</p>`;
  currentMenu = null;
  try {
    const response = await fetch(firebaseMenuURL(dateInput.value), { cache: "no-store" });
    if (!response.ok) throw new Error("Firebase menu request failed");
    const firebaseMenu = await response.json();
    currentMenu = firebaseMenu || fallbackMenu(dateInput.value);
  } catch {
    currentMenu = fallbackMenu(dateInput.value);
  }
  render();
}

document.querySelectorAll(".day-button").forEach(button => {
  button.addEventListener("click", () => {
    selectedSection = button.dataset.day;
    if (selectedSection === "today") {
      dateInput.value = offsetDate(0);
    } else if (selectedSection === "tomorrow") {
      dateInput.value = offsetDate(1);
    }
    document.querySelectorAll(".day-button").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    loadMenu();
  });
});

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function refreshApp() {
  const button = document.querySelector("#refresh");
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  window.location.reload();
}

const today = new Date();
dateInput.value = today.getFullYear() === 2026 && today.getMonth() === 9
  ? today.toISOString().slice(0, 10)
  : "2026-10-01";
dateInput.addEventListener("change", () => {
  selectedSection = "today";
  document.querySelectorAll(".day-button").forEach(item => {
    item.classList.toggle("active", item.dataset.day === "today");
    item.setAttribute("aria-selected", String(item.dataset.day === "today"));
  });
  loadMenu();
});
document.querySelector("#refresh").addEventListener("click", refreshApp);
loadMenu();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
