const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function mapWttrWeather(payload, locationInput) {
  const current = payload?.current_condition?.[0] || {};
  const nearestArea = payload?.nearest_area?.[0] || {};

  return {
    ok: true,
    source: "wttr.in (no key mode)",
    city: nearestArea?.areaName?.[0]?.value || locationInput,
    country: nearestArea?.country?.[0]?.value || "N/A",
    region: nearestArea?.adminArea1?.[0]?.value || "",
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
  res.json({ ok: true, service: "global-weather-proxy" });
});

app.get("/api/countries", async (_req, res) => {
  try {
    const response = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,flag");
    const countries = await response.json();

    if (!Array.isArray(countries)) {
      throw new Error("Response is not an array");
    }

    const sorted = countries
      .map((c) => ({
        name: c.name.common,
        code: c.cca2,
        flag: c.flag,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json({ ok: true, countries: sorted });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Failed to fetch countries",
      error: error.message,
    });
  }
});

app.get("/api/search", async (req, res) => {
  const query = req.query.q;

  if (!query || String(query).trim().length < 2) {
    return res.status(400).json({
      ok: false,
      message: "Query 'q' must be at least 2 characters. Example: /api/search?q=Lagos",
    });
  }

  try {
    const searchUrl = new URL(`https://wttr.in/~${encodeURIComponent(String(query).trim())}`);
    searchUrl.searchParams.set("format", "j1");

    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "global-weather-proxy/1.0" },
    });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: "Location search failed",
      });
    }

    const nearestArea = data?.nearest_area?.[0] || {};
    const suggestion = {
      city: nearestArea?.areaName?.[0]?.value || String(query).trim(),
      region: nearestArea?.adminArea1?.[0]?.value || "",
      country: nearestArea?.country?.[0]?.value || "",
      latitude: nearestArea?.latitude,
      longitude: nearestArea?.longitude,
    };

    return res.json({ ok: true, suggestion });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Location search error",
      error: error.message,
    });
  }
});

app.get("/api/weather", async (req, res) => {
  const location = req.query.location;
  const rawApiKey = process.env.OPENWEATHER_API_KEY;
  const apiKey = typeof rawApiKey === "string" ? rawApiKey.trim() : "";
  const hasUsableApiKey =
    apiKey !== "" && apiKey !== "your_openweather_api_key_here";

  if (!location || String(location).trim() === "") {
    return res.status(400).json({
      ok: false,
      message: "Query param 'location' is required. Example: /api/weather?location=Lagos,Nigeria",
    });
  }

  try {
    if (!hasUsableApiKey) {
      const fallbackUrl = new URL(`https://wttr.in/${encodeURIComponent(String(location).trim())}`);
      fallbackUrl.searchParams.set("format", "j1");

      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { "User-Agent": "global-weather-proxy/1.0" },
      });
      const fallbackData = await fallbackResponse.json();

      if (!fallbackResponse.ok) {
        return res.status(fallbackResponse.status).json({
          ok: false,
          message: "Weather provider request failed",
        });
      }

      return res.json(mapWttrWeather(fallbackData, String(location).trim()));
    }

    const externalUrl = new URL("https://api.openweathermap.org/data/2.5/weather");
    externalUrl.searchParams.set("q", String(location).trim());
    externalUrl.searchParams.set("appid", apiKey);
    externalUrl.searchParams.set("units", "metric");

    const response = await fetch(externalUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        message: data?.message || "Weather API request failed",
      });
    }

    return res.json({
      ok: true,
      source: "OpenWeather",
      city: data.name,
      country: data.sys?.country,
      region: "",
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
      message: "Failed to fetch weather",
      error: error.message,
    });
  }
});

app.use(express.static(path.join(__dirname, "../frontend")));

app.listen(PORT, () => {
  console.log(`🌍 Global weather proxy running on http://localhost:${PORT}`);
});
