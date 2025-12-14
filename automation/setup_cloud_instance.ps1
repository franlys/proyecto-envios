$headers = @{ 
    apikey         = "429683C4C977415CAAFCCE10F7D57E11" 
    "Content-Type" = "application/json"
}
$baseUrl = "https://evolution-api-production-0fa7.up.railway.app"
$instanceName = "ProLogixCloud" # Usare un nombre nuevo para garantizar limpieza

Write-Host "NUCLEAR CLOUD RESET: Target $instanceName"

# 1. DELETE (Clean slate)
try {
    Write-Host "1. Deleting old instance..."
    Invoke-RestMethod -Method Delete -Uri "$baseUrl/instance/delete/$instanceName" -Headers $headers -ErrorAction SilentlyContinue
}
catch {}
Start-Sleep -Seconds 2

# 2. CREATE (Fresh start)
Write-Host "2. Creating new instance..."
$body = @{
    instanceName = $instanceName
    token        = "123456"
    qrcode       = $true
    integration  = "WHATSAPP-BAILEYS"
} | ConvertTo-Json

try {
    $createRes = Invoke-RestMethod -Method Post -Uri "$baseUrl/instance/create" -Headers $headers -Body $body
    Write-Host "Create Response: $($createRes | ConvertTo-Json -Depth 2)"
}
catch {
    Write-Host "Create Error: $_"
}

# 3. POLL (Wait for QR)
Write-Host "3. Waiting for QR (Max 60s)..."
$qrFound = $false

for ($i = 1; $i -le 12; $i++) {
    Write-Host "Polling ($i/12)..."
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/instance/connect/$instanceName" -Headers $headers -ErrorAction SilentlyContinue
        
        $base64 = $null
        if ($response.base64) { $base64 = $response.base64 }
        elseif ($response.qrcode.base64) { $base64 = $response.qrcode.base64 }

        if ($base64) {
            $html = "<html><body style='background:#111; color:white; text-align:center; font-family:sans-serif; padding:50px;'><h1>Scan Cloud QR</h1><h2 style='color:#4caf50'>Instance: $instanceName</h2><img src='$base64' style='border:10px solid white; border-radius:10px; width:350px;'/><br><p>Refresca si expira</p></body></html>"
            Set-Content -Path "qr_cloud.html" -Value $html
            Write-Host "SUCCESS: Cloud QR saved to qr_cloud.html"
            $qrFound = $true
            break
        }
    }
    catch {
        Write-Host "Waiting... $_"
    }
    Start-Sleep -Seconds 5
}

if (-not $qrFound) {
    Write-Host "ERROR: Timeout waiting for Cloud QR."
}
