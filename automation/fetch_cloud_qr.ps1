$headers = @{ apikey = "429683C4C977415CAAFCCE10F7D57E11" }
$baseUrl = "https://evolution-api-production-0fa7.up.railway.app"
$instanceName = "Prologix"

Write-Host "Connecting to CLOUD instance: $instanceName at $baseUrl"

# 1. Trigger Connection (Just in case)
try {
    Invoke-RestMethod -Uri "$baseUrl/instance/connect/$instanceName" -Headers $headers -ErrorAction SilentlyContinue
}
catch {}

Write-Host "Polling Cloud for QR Code..."
$qrFound = $false

for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/instance/connect/$instanceName" -Headers $headers -ErrorAction Stop
        
        $base64 = $null
        if ($response.base64) { $base64 = $response.base64 }
        elseif ($response.qrcode.base64) { $base64 = $response.qrcode.base64 }

        if ($base64) {
            $html = "<html><body style='background:#222; color:white; text-align:center; font-family:sans-serif;'><h1>Scan Cloud QR</h1><img src='$base64' style='border:10px solid white; border-radius:10px; width:300px;'/></body></html>"
            Set-Content -Path "qr_cloud.html" -Value $html
            Write-Host "SUCCESS: Cloud QR saved to qr_cloud.html"
            $qrFound = $true
            break
        }
    }
    catch {
        Write-Host "Waiting... ($i/10) - $_"
    }
    Start-Sleep -Seconds 3
}

if (-not $qrFound) {
    Write-Host "ERROR: Could not retrieve QR Code from Cloud."
}
