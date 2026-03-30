# 🔥❄️ Hot_Cold_World - Global Weather App

A production-grade fullstack weather application serving real-time weather data across 195+ countries worldwide.

**Features:**
- 🌍 Global country selection + city search
- 🔐 Secure API key handling (server-side)
- 🎨 Beautiful purple/teal theme with day/night modes
- 💐 Docker containerization for easy deployment
- ☁️ AWS-ready with ECS, Fargate, and Secrets Manager support
- 📱 Fully responsive design

## Project Structure

```
hot-cold-world/
├── backend/
│   ├── server.js           # Express REST API + proxy + webhooks
│   ├── package.json
│   └── .env                # API keys (secret, not in repo)
├── frontend/
│   ├── index.html          # Web app with country picker
│   ├── script.js           # Weather fetch + hierarchical UI logic
│   └── styles.css          # Purple/teal theme + animations
├── Dockerfile              # Multi-stage build for production
├── docker-compose.yml      # Local development with Docker
├── ecs-task-definition.json # AWS ECS configuration
├── AWS_DEPLOYMENT.md       # Complete AWS deployment guide
└── README.md               # This file
```

## Quick Start (Local)

### Option 1: Native Node.js

```bash
cd backend
npm install
npm start
```

Open `http://localhost:5000` in your browser.

### Option 2: Docker

```bash
docker-compose up --build
```

The app will be available at `http://localhost:5000`

## Configuration

Create `backend/.env`:

```env
OPENWEATHER_API_KEY=your_real_api_key_here
PORT=5000
```

If no API key is provided, the app runs in **fallback mode** using the free wttr.in service.

## REST Endpoints

| Endpoint | Description | Example |
|----------|-------------|---------|
| `GET /api/health` | Service status | `http://localhost:5000/api/health` |
| `GET /api/countries` | List 250+ countries with flags | `http://localhost:5000/api/countries` |
| `GET /api/search?q=Mumbai` | Location autocomplete | `http://localhost:5000/api/search?q=Mumbai` |
| `GET /api/weather?location=Lagos,Nigeria` | Weather for any location | `http://localhost:5000/api/weather?location=London,UK` |

**Response Example:**
```json
{
  "ok": true,
  "city": "Lagos",
  "country": "Nigeria",
  "region": "Lagos",
  "temperatureC": 33,
  "feelsLikeC": 35,
  "condition": "partly cloudy",
  "isDay": true,
  "humidity": 53,
  "windSpeed": 4.2
}
```

## API Providers

- **Primary**: OpenWeather (requires paid API key)
- **Fallback**: wttr.in (free, no authentication)
- **Countries**: restcountries.com API

## Docker Deployment

### Build Local Image

```bash
docker build -t hot-cold-world:latest .
```

### Run Container

```bash
docker run -p 5000:5000 \
  -e OPENWEATHER_API_KEY=your_key \
  -e NODE_ENV=production \
  hot-cold-world:latest
```

### Development with Docker Compose

```bash
docker-compose up --build
docker-compose logs -f
docker-compose down
```

## AWS Deployment

### Architecture

- **ECS Fargate**: Container orchestration
- **ECR**: Docker image registry
- **Secrets Manager**: Store OpenWeather API key securely
- **CloudWatch**: Logs and monitoring
- **ALB** (Optional): Load balancer for traffic distribution

### Quick Deploy Steps

1. **Push to ECR:**
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   docker build -t hot-cold-world:latest .
   docker tag hot-cold-world:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hot-cold-world:latest
   docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hot-cold-world:latest
   ```

2. **Create Secrets Manager Secret:**
   ```bash
   aws secretsmanager create-secret --name openweather-api-key --secret-string "your_key" --region us-east-1
   ```

3. **Create ECS Cluster:**
   ```bash
   aws ecs create-cluster --cluster-name hot-cold-world-cluster --region us-east-1
   ```

4. **Register Task & Launch Service:**
   See [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) for complete step-by-step guide.

### Monitor AWS Deployment

```bash
# View logs
aws logs tail /ecs/hot-cold-world --follow

# Check service status
aws ecs describe-services --cluster hot-cold-world-cluster --services hot-cold-world-service

# View running tasks
aws ecs list-tasks --cluster hot-cold-world-cluster
```

## Frontend Features

- **Country Dropdown**: All 250+ countries with flags
- **Location Search**: Real-time autocomplete for cities worldwide
- **Weather Display**: Temperature, feels-like, humidity, wind speed
- **Dynamic Icons**: 6 animated weather conditions
- **Day/Night Mode**: UI theme switches based on local time
- **Responsive**: Mobile, tablet, and desktop optimized

## Technology Stack

- **Runtime**: Node.js v25.8.2+
- **Backend**: Express.js 4.19.2
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Styling**: CSS3 with animations and gradients
- **Containerization**: Docker with multi-stage builds
- **Infrastructure**: AWS ECS Fargate, ECR, Secrets Manager
- **Monitoring**: CloudWatch Logs

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `OPENWEATHER_API_KEY` | No | placeholder | Third-party weather API key |
| `PORT` | No | 5000 | Server port |
| `NODE_ENV` | No | development | Environment mode |

## Performance

- **First Load**: < 500ms (with CDN it can be < 200ms)
- **API Latency**: 200-500ms (depends on provider + network)
- **Bundle Size**: Frontend only ~15KB (gzipped)
- **Container Size**: ~150MB (with Node.js runtime)

## Security

✅ API keys stored server-side only (never exposed to frontend)
✅ CORS enabled for trusted origins
✅ Environment-based configuration  
✅ Non-root user in Docker containers
✅ secrets Manager integration for AWS deployment
✅ Health checks for monitoring

## Troubleshooting

### "Cannot find module 'express'"
```bash
cd backend && npm install
```

### "API returned 401 Unauthorized"
- Check your OpenWeather API key in `.env`
- Verify the key is activated (may take a few minutes)
- App will automatically fallback to wttr.in if key is invalid

### Docker build fails
```bash
docker build --no-cache -t hot-cold-world:latest .
```

### Connection refused on localhost:5000
```bash
# Check if port is in use
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3000 npm start
```

## Contributing

1. Create a branch for your feature
2. Make changes
3. Test locally with Docker
4. Commit with clear messages
5. Push to GitHub

## Deployment Checklist

- [ ] API key configured in `.env` (local) or Secrets Manager (AWS)
- [ ] Dockerfile builds successfully
- [ ] Docker image runs locally
- [ ] AWS ECR repository created
- [ ] ECS task definition registered
- [ ] Service deployed and running
- [ ] CloudWatch logs accessible
- [ ] ALB health checks passing (if using ALB)
- [ ] Domain/DNS configured (if using custom domain)

## License

MIT

## Support

For full AWS deployment instructions, see [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md)

---

**Made with 🔥 and ❄️ | Global Weather at Your Fingertips**

- Uses OpenWeather when `OPENWEATHER_API_KEY` is configured
- Falls back to `wttr.in` when key is missing

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

If no API key is configured, the script still runs and tests fallback mode.

Run:

```powershell
cd backend
./test-local.ps1
```

Keep server running for frontend testing:

```powershell
./test-local.ps1 -City "Lagos" -KeepServerRunning
```

Optional city parameter:

```powershell
./test-local.ps1 -City "Abuja"
```
