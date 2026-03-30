const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const result = document.getElementById("result");

async function getWeather() {
  const city = cityInput.value.trim();

  if (!city) {
    result.innerHTML = "<p>Please type a city name first.</p>";
    return;
  }

  result.innerHTML = "<p>Loading...</p>";

  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      result.innerHTML = `<p>Error: ${data.message || "Request failed"}</p>`;
      return;
    }

    result.innerHTML = `
      <h2>${data.city}, ${data.country}</h2>
      <p><strong>Temperature:</strong> ${data.temperatureC} C</p>
      <p><strong>Feels Like:</strong> ${data.feelsLikeC} C</p>
      <p><strong>Condition:</strong> ${data.condition}</p>
      <p><strong>Humidity:</strong> ${data.humidity}%</p>
      <p><strong>Wind Speed:</strong> ${data.windSpeed} m/s</p>
    `;
  } catch (error) {
    result.innerHTML = `<p>Network error: ${error.message}</p>`;
  }
}

searchBtn.addEventListener("click", getWeather);
cityInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    getWeather();
  }
});
