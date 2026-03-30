const countrySelect = document.getElementById("countrySelect");
const citySearch = document.getElementById("citySearch");
const searchBtn = document.getElementById("searchBtn");
const result = document.getElementById("result");
let countryMap = {};

function setTheme(isDay) {
  document.body.classList.remove("theme-day", "theme-night");
  document.body.classList.add(isDay ? "theme-day" : "theme-night");
}

function pickIconKind(data) {
  const iconCode = String(data.iconCode || "");
  const condition = String(data.condition || "").toLowerCase();

  if (iconCode.startsWith("11") || condition.includes("thunder")) return "storm";
  if (iconCode.startsWith("13") || condition.includes("snow")) return "snow";
  if (
    iconCode.startsWith("09") ||
    iconCode.startsWith("10") ||
    condition.includes("rain") ||
    condition.includes("drizzle")
  ) {
    return "rain";
  }
  if (iconCode.startsWith("50") || condition.includes("mist") || condition.includes("haze")) {
    return "mist";
  }
  if (iconCode.startsWith("01") || condition.includes("clear")) return "clear";
  return "cloudy";
}

function setMessage(message, type = "info") {
  result.classList.remove("is-error", "is-loading");
  if (type === "error") {
    result.classList.add("is-error");
  }
  if (type === "loading") {
    result.classList.add("is-loading");
  }
  result.innerHTML = `<p class="status-text">${message}</p>`;
}

async function loadCountries() {
  try {
    const response = await fetch("/api/countries");
    const data = await response.json();

    if (!data.ok) {
      setMessage("Failed to load countries", "error");
      return;
    }

    const options = data.countries.map((c) => `<option value="${c.code}">${c.flag} ${c.name}</option>`).join("");
    countrySelect.innerHTML = `<option value="">Select a country...</option>${options}`;
    countryMap = data.countries.reduce((acc, c) => {
      acc[c.code] = c.name;
      return acc;
    }, {});
  } catch (error) {
    setMessage(`Error loading countries: ${error.message}`, "error");
  }
}

async function getWeather() {
  const query = citySearch.value.trim();
  const countryCode = countrySelect.value;

  if (!query) {
    setMessage("Please enter a city or location.", "error");
    return;
  }

  let location = query;
  if (countryCode && countryMap[countryCode]) {
    location = `${query}, ${countryMap[countryCode]}`;
  }

  setMessage("Loading weather data...", "loading");

  try {
    const response = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(`Error: ${data.message || "Request failed"}`, "error");
      return;
    }

    const iconKind = pickIconKind(data);
    setTheme(Boolean(data.isDay));

    const regionDisplay = data.region && data.region !== data.country ? `${data.region}, ` : "";

    result.classList.remove("is-error", "is-loading");
    result.innerHTML = `
      <div class="weather-head">
        <h2>${data.city}</h2>
        <span class="location-info">${regionDisplay}${data.country}</span>
        <span class="weather-tag">${data.condition}</span>
      </div>
      <div class="weather-hero">
        <div class="weather-main">${Math.round(data.temperatureC)} °C</div>
        <div class="weather-icon weather-icon-${iconKind}" aria-hidden="true"></div>
      </div>
      <div class="weather-grid">
        <article class="metric">
          <p class="metric-label">Feels Like</p>
          <p class="metric-value">${Math.round(data.feelsLikeC)} °C</p>
        </article>
        <article class="metric">
          <p class="metric-label">Humidity</p>
          <p class="metric-value">${data.humidity}%</p>
        </article>
        <article class="metric">
          <p class="metric-label">Wind</p>
          <p class="metric-value">${data.windSpeed} m/s</p>
        </article>
      </div>
    `;
  } catch (error) {
    setMessage(`Network error: ${error.message}`, "error");
  }
}

searchBtn.addEventListener("click", getWeather);
citySearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    getWeather();
  }
});
countrySelect.addEventListener("change", (_event) => {
  citySearch.focus();
});

loadCountries();
setTheme(true);
