const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const result = document.getElementById("result");

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

async function getWeather() {
  const city = cityInput.value.trim();

  if (!city) {
    setMessage("Please type a city name first.", "error");
    return;
  }

  setMessage("Loading weather data...", "loading");

  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      setMessage(`Error: ${data.message || "Request failed"}`, "error");
      return;
    }

    const iconKind = pickIconKind(data);
    setTheme(Boolean(data.isDay));

    result.classList.remove("is-error", "is-loading");
    result.innerHTML = `
      <div class="weather-head">
        <h2>${data.city}, ${data.country}</h2>
        <span class="weather-tag">${data.condition}</span>
      </div>
      <div class="weather-hero">
        <div class="weather-main">${Math.round(data.temperatureC)} C</div>
        <div class="weather-icon weather-icon-${iconKind}" aria-hidden="true"></div>
      </div>
      <div class="weather-grid">
        <article class="metric">
          <p class="metric-label">Feels Like</p>
          <p class="metric-value">${Math.round(data.feelsLikeC)} C</p>
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
cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    getWeather();
  }
});

setTheme(true);
