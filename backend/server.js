const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "weather-proxy" });
});

app.get("/api/weather", async (req, res) => {
  const city = req.query.city;
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!city || String(city).trim() === "") {
    return res.status(400).json({
      ok: false,
      message: "Query param 'city' is required. Example: /api/weather?city=Lagos",
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      message:
        "Server is missing OPENWEATHER_API_KEY. Add it to backend/.env first.",
    });
  }

  try {
    const externalUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
    externalUrl.searchParams.set("q", String(city).trim());
    externalUrl.searchParams.set("appid", apiKey);
    externalUrl.searchParams.set("units", "metric");

    const response = await fetch(externalUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: data?.message || "External API request failed",
      });
    }

    return res.json({
      ok: true,
      source: "OpenWeather",
      city: data.name,
      country: data.sys?.country,
      temperatureC: data.main?.temp,
      feelsLikeC: data.main?.feels_like,
      condition: data.weather?.[0]?.description,
      iconCode: data.weather?.[0]?.icon,
      isDay: String(data.weather?.[0]?.icon || "").endsWith("d"),
      humidity: data.main?.humidity,
      windSpeed: data.wind?.speed,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to reach external weather API",
      error: error.message,
    });
  }
});

app.use(express.static(path.join(__dirname, "../frontend")));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
