const DATABASE_URL = "https://cumeal-4090b-default-rtdb.firebaseio.com/menu";
const CACHE_NAME = "cumeal-menu-v1";
const fields = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["snacksBoys", "Snacks (Boys)"],
  ["snacksGirls", "Snacks (Girls)"],
  ["dinner", "Dinner"],
  ["dinnerSouth", "Dinner (South)"]
];

let selectedDay = "today";
const menus = new Map();

function dateFor(day) {
  const date = new Date();
  if (day === "tomorrow") date.setDate(date.getDate() + 1);
  return date;
}

function dateParts(date) {
  return {
    year: date.getFullYear(),
    month: date.toLocaleString("en-US", { month: "long" }),
    day: date.getDate()
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(date);
}

function menuURL(day) {
  const { year, month, day: date } = dateParts(dateFor(day));
  return `${DATABASE_URL}/${year}/${month}/${date}.json`;
}

function render() {
  const showingTimings = selectedDay === "timings";
  document.querySelector("#date").textContent = showingTimings
    ? "Mess timings"
    : formatDate(dateFor(selectedDay));
  document.querySelector("#menu").hidden = showingTimings;
  document.querySelector("#timings").hidden = !showingTimings;
  if (showingTimings) return;

  const menu = menus.get(selectedDay);
  const container = document.querySelector("#menu");
  if (!menu) {
    container.innerHTML = `<p class="status">No menu is available for this date.</p>`;
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
  container.innerHTML = rows || `<p class="status">No menu is available for this date.</p>`;
}

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

async function fetchMenu(day) {
  const url = menuURL(day);
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Menu request failed");
    const data = await response.json();
    if (!data) throw new Error("Menu unavailable");
    await cache.put(url, new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    }));
    menus.set(day, data);
  } catch (error) {
    const cached = await cache.match(url);
    if (!cached) throw error;
    menus.set(day, await cached.json());
  }
}

async function loadMenus() {
  document.querySelector("#menu").innerHTML = `<p class="status">Loading menu…</p>`;
  try {
    await Promise.all(["today", "tomorrow"].map(fetchMenu));
    render();
  } catch {
    render();
    document.querySelector("#menu").innerHTML = `<p class="status">Menu unavailable. Pull to refresh and try again.</p>`;
  }
}

document.querySelectorAll(".day-button").forEach(button => {
  button.addEventListener("click", () => {
    selectedDay = button.dataset.day;
    document.querySelectorAll(".day-button").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    render();
  });
});

async function refreshApp() {
  const button = document.querySelector("#refresh");
  button.disabled = true;
  button.setAttribute("aria-busy", "true");

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    }
    window.location.reload();
  } catch {
    await loadMenus();
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

document.querySelector("#refresh").addEventListener("click", refreshApp);
window.addEventListener("online", loadMenus);
loadMenus();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
