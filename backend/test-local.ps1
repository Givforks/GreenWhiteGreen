param(
    [string]$City = "Lagos",
    [switch]$KeepServerRunning
)

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
    Write-Host "Add OPENWEATHER_API_KEY in backend/.env, then run this script again."
    exit 1
}

$envContent = Get-Content ".env" -Raw
if ($envContent -match "OPENWEATHER_API_KEY=your_openweather_api_key_here" -or $envContent -notmatch "OPENWEATHER_API_KEY=") {
    Write-Host "OPENWEATHER_API_KEY is not configured in backend/.env"
    Write-Host "Continuing in fallback mode (wttr.in, no key)."
}

Write-Host "Installing dependencies..."
npm.cmd install

Write-Host "Starting server in background..."
$serverJob = $null
$serverProcess = $null

if ($KeepServerRunning) {
    $serverProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "start" -WorkingDirectory $PSScriptRoot -PassThru
}
else {
    $serverJob = Start-Job -ScriptBlock {
        Set-Location $using:PSScriptRoot
        npm.cmd start
    }
}

Start-Sleep -Seconds 6

try {
    Write-Host "\nHealth response:"
    Invoke-RestMethod "http://localhost:5000/api/health" | ConvertTo-Json -Depth 5

    Write-Host "\nWeather response:"
    $encodedCity = [System.Uri]::EscapeDataString($City)
    Invoke-RestMethod "http://localhost:5000/api/weather?city=$encodedCity" | ConvertTo-Json -Depth 5

    Write-Host "\nFrontend URL: http://localhost:5000"
    if ($KeepServerRunning) {
        Write-Host "Server is still running in background."
        if ($null -ne $serverProcess) {
            Write-Host "Server PID: $($serverProcess.Id)"
            Write-Host "When done, stop it with: Stop-Process -Id $($serverProcess.Id)"
        }
    }
}
catch {
    Write-Host "Test failed: $($_.Exception.Message)"
    throw
}
finally {
    if ($null -ne $serverJob -and -not $KeepServerRunning) {
        Stop-Job $serverJob -ErrorAction SilentlyContinue
        Remove-Job $serverJob -ErrorAction SilentlyContinue
        Write-Host "Server job stopped after tests."
    }
}
