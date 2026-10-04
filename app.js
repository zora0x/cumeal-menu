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
let selectedDate = "";
let currentMenu = null;
let loadRequest = 0;
let calendarMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let availabilityRequest = 0;
const dateTrigger = document.querySelector("#date-trigger");
const calendar = document.querySelector("#calendar");
const availableDates = new Set();

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

function dateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromValue(value) {
  return new Date(`${value}T12:00:00`);
}

function setSelectedDate(value) {
  selectedDate = value;
  currentMenu = null;
  calendar.hidden = true;
  updateTabs();
}

function render() {
  const showingTimings = selectedSection === "timings";
  const date = dateFromValue(selectedDate);
  document.querySelector("#date").textContent = showingTimings
    ? "Mess timings"
    : formatDate(date);
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

function fallbackMenu(dateValue) {
  if (!OCTOBER_MENU[dateValue]) return null;
  const menu = {
    ...OCTOBER_MENU[dateValue],
    dinnerSouth: SOUTH_INDIAN_DINNER[dateValue]
  };
  const dessert = PDF_DESSERTS[dateValue];
  if (dessert && menu.dinner && !menu.dinner.toLowerCase().includes(dessert.toLowerCase())) {
    menu.dinner = `${menu.dinner}, ${dessert}`;
  }
  return menu;
}

function normalizeMenu(menu) {
  if (!menu || typeof menu !== "object" || Array.isArray(menu)) return null;
  const normalized = {};
  fields.forEach(([key]) => {
    const value = typeof menu[key] === "string" ? menu[key].trim() : "";
    if (value && !(key === "breakfast" && /^\d{1,2}$/.test(value))) {
      normalized[key] = value;
    }
  });
  return Object.keys(normalized).length ? normalized : null;
}

function mergeMenus(primary, fallback) {
  const firebaseMenu = normalizeMenu(primary) || {};
  const fallbackData = normalizeMenu(fallback) || {};
  const menu = fields.reduce((result, [key]) => {
    result[key] = firebaseMenu[key] || fallbackData[key] || "";
    return result;
  }, {});
  return menu;
}

async function loadMenu() {
  if (selectedSection === "timings") {
    render();
    return;
  }

  const request = ++loadRequest;
  document.querySelector("#menu").innerHTML = `<p class="status">Loading menu…</p>`;
  currentMenu = null;
  try {
    const response = await fetch(firebaseMenuURL(selectedDate), { cache: "no-store" });
    if (!response.ok) throw new Error("Firebase menu request failed");
    const firebaseMenu = await response.json();
    const pdfMenu = fallbackMenu(selectedDate);
    currentMenu = mergeMenus(firebaseMenu, pdfMenu);
  } catch {
    currentMenu = mergeMenus(null, fallbackMenu(selectedDate));
  }
  if (request !== loadRequest) return;
  render();
}

function updateTabs() {
  document.querySelectorAll(".day-button").forEach(item => {
    const active = item.dataset.day === selectedSection;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
  });
}

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let index = 0; index < firstDay; index += 1) {
    cells.push("<span></span>");
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const value = dateValue(new Date(year, month, day));
    const available = availableDates.has(value);
    const selected = value === selectedDate ? " selected" : "";
    const today = value === dateValue(new Date()) ? " today" : "";
    cells.push(`<button class="calendar-day${selected}${today}" type="button" data-date="${value}" ${available ? "" : "disabled"}>${day}</button>`);
  }
  const monthName = calendarMonth.toLocaleString("en-US", { month: "long" });
  calendar.innerHTML = `<div class="calendar-header"><button class="month-button" data-month="-1" type="button" aria-label="Previous month">‹</button><strong>${monthName} ${year}</strong><button class="month-button" data-month="1" type="button" aria-label="Next month">›</button></div><div class="calendar-week"><span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span></div><div class="calendar-grid">${cells.join("")}</div>`;
  calendar.querySelectorAll("[data-month]").forEach(button => {
    button.addEventListener("click", () => {
      calendarMonth.setMonth(calendarMonth.getMonth() + Number(button.dataset.month));
      loadAvailability();
    });
  });
  calendar.querySelectorAll("[data-date]").forEach(button => {
    button.addEventListener("click", () => {
      setSelectedDate(button.dataset.date);
      loadMenu();
    });
  });
}

async function loadAvailability() {
  const request = ++availabilityRequest;
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const dates = Array.from(
    { length: new Date(year, month + 1, 0).getDate() },
    (_, index) => dateValue(new Date(year, month, index + 1))
  );
  availableDates.clear();
  renderCalendar();
  const results = await Promise.all(dates.map(async value => {
    try {
      const response = await fetch(firebaseMenuURL(value), { cache: "no-store" });
      const menu = await response.json();
      return [value, Boolean(menu || fallbackMenu(value))];
    } catch {
      return [value, Boolean(fallbackMenu(value))];
    }
  }));
  results.forEach(([value, available]) => {
    if (available) availableDates.add(value);
  });
  if (request !== availabilityRequest) return;
  renderCalendar();
}

document.querySelectorAll(".day-button").forEach(button => {
  button.addEventListener("click", () => {
    selectedSection = button.dataset.day;
    if (selectedSection === "today") {
      setSelectedDate(offsetDate(0));
    } else if (selectedSection === "tomorrow") {
      setSelectedDate(offsetDate(1));
    }
    loadMenu();
  });
});

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateValue(date);
}

function refreshApp() {
  const button = document.querySelector("#refresh");
  button.classList.add("spinning");
  button.disabled = true;
  if (navigator.vibrate) navigator.vibrate(10);
  Promise.all([loadMenu(), loadAvailability()]).finally(() => {
    button.classList.remove("spinning");
    button.disabled = false;
  });
}

const today = new Date();
selectedDate = today.getFullYear() === 2026 && today.getMonth() === 9
  ? dateValue(today)
  : "2026-10-01";
dateTrigger.addEventListener("click", () => {
  calendar.hidden = !calendar.hidden;
  if (!calendar.hidden) renderCalendar();
});
document.querySelector("#refresh").addEventListener("click", refreshApp);
loadMenu();
loadAvailability();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
