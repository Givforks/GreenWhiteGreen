# Quick Fullstack REST API Demo

This project shows how to build a simple fullstack app where:

- Frontend calls your own backend (`/api/weather`)
- Backend calls a third-party API (OpenWeather)
- API key is stored safely on the server in `.env`

## Project Structure

- `backend/server.js`: Express REST API and third-party API proxy
- `frontend/index.html`: basic UI
- `frontend/script.js`: frontend fetch logic
- `frontend/styles.css`: styling

## 1) Get an External API Key

1. Create an account at OpenWeather: https://openweathermap.org/api
2. Copy your API key

## 2) Configure Environment Variable

Create `backend/.env`:

```env
OPENWEATHER_API_KEY=your_real_api_key_here
PORT=5000
```

## 3) Install and Run

```bash
cd backend
npm install
npm start
```

Open `http://localhost:5000` in your browser.

## REST Endpoints

- `GET /api/health`
- `GET /api/weather?city=Lagos`

Example response:

```json
{
	"ok": true,
	"source": "OpenWeather",
	"city": "Lagos",
	"country": "NG",
	"temperatureC": 27.4,
	"feelsLikeC": 31.2,
	"condition": "scattered clouds",
	"humidity": 81,
	"windSpeed": 2.5
}
```

## Why Not Put API Key in Frontend?

If you put keys in frontend JS, anyone can view and steal them.
Use your backend as a secure proxy so the key stays private.

## Quick Local Test Script (PowerShell)

You can run a single script that:

- checks `.env`
- installs backend dependencies
- starts server in background
- tests health and weather endpoints
- stops the server job

Run:

```powershell
cd backend
./test-local.ps1
```

Optional city parameter:

```powershell
./test-local.ps1 -City "Abuja"
```
