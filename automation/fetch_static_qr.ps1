$headers = @{ apikey = "429683C4C977415CAAFCCE10F7D57E11" }
$instanceName = "Prologix"

Write-Host "Connecting to instance $instanceName..."
# Trigger connection just in case
try {
    Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/$instanceName" -Headers $headers -ErrorAction SilentlyContinue
}
catch {}

Write-Host "Polling for QR Code..."
$qrFound = $false

for ($i = 1; $i -le 10; $i++) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/$instanceName" -Headers $headers -ErrorAction Stop
        
        $base64 = $null
        if ($response.base64) { $base64 = $response.base64 }
        elseif ($response.qrcode.base64) { $base64 = $response.qrcode.base64 }

        if ($base64) {
            $html = "<html><body style='background:#222; color:white; text-align:center; font-family:sans-serif;'><h1>Scan this QR Code</h1><img src='$base64' style='border:10px solid white; border-radius:10px; width:300px;'/></body></html>"
            Set-Content -Path "qr_static.html" -Value $html
            Write-Host "SUCCESS: QR Code saved to qr_static.html"
            $qrFound = $true
            break
        }
    }
    catch {
        Write-Host "Waiting... ($i/10)"
    }
    Start-Sleep -Seconds 3
}

if (-not $qrFound) {
    Write-Host "ERROR: Could not retrieve QR Code after 30 seconds."
}
