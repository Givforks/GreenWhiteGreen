const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const result = document.getElementById("result");

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

    result.classList.remove("is-error", "is-loading");
    result.innerHTML = `
      <div class="weather-head">
        <h2>${data.city}, ${data.country}</h2>
        <span class="weather-tag">${data.condition}</span>
      </div>
      <div class="weather-main">${Math.round(data.temperatureC)} C</div>
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
