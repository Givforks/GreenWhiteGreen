const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function mapWttrWeather(payload, cityInput) {
  const current = payload?.current_condition?.[0] || {};
  const nearestArea = payload?.nearest_area?.[0] || {};

  return {
    ok: true,
    source: "wttr.in (no key mode)",
    city: nearestArea?.areaName?.[0]?.value || cityInput,
    country: nearestArea?.country?.[0]?.value || "N/A",
    temperatureC: Number(current?.temp_C ?? 0),
    feelsLikeC: Number(current?.FeelsLikeC ?? 0),
    condition: (current?.weatherDesc?.[0]?.value || "clear").toLowerCase(),
    iconCode: null,
    isDay: true,
    humidity: Number(current?.humidity ?? 0),
    windSpeed: Number(current?.windspeedKmph ?? 0) / 3.6,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "weather-proxy" });
});

app.get("/api/weather", async (req, res) => {
  const city = req.query.city;
  const rawApiKey = process.env.OPENWEATHER_API_KEY;
  const apiKey =
    typeof rawApiKey === "string" ? rawApiKey.trim() : "";
  const hasUsableApiKey =
    apiKey !== "" && apiKey !== "your_openweather_api_key_here";

  if (!city || String(city).trim() === "") {
    return res.status(400).json({
      ok: false,
      message: "Query param 'city' is required. Example: /api/weather?city=Lagos",
    });
  }

  try {
    if (!hasUsableApiKey) {
      const fallbackUrl = new URL(`https://wttr.in/${encodeURIComponent(String(city).trim())}`);
      fallbackUrl.searchParams.set("format", "j1");

      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          "User-Agent": "weather-proxy-demo/1.0",
        },
      });
      const fallbackData = await fallbackResponse.json();

      if (!fallbackResponse.ok) {
        return res.status(fallbackResponse.status).json({
          ok: false,
          message: "Fallback weather provider request failed",
        });
      }

      return res.json(mapWttrWeather(fallbackData, String(city).trim()));
    }

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
