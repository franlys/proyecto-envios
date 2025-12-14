$headers = @{
    apikey = "429683C4C977415CAAFCCE10F7D57E11"
}

try {
    # 1. Get Instance Name
    $instances = Invoke-RestMethod -Uri "http://localhost:8080/instance/fetchInstances" -Headers $headers
    # Force use of 'Prologix'
    $instanceName = "Prologix"
    Write-Host "Targeting Instance: $instanceName"

    # 1. DELETE existing instance
    try {
        Write-Host "Deleting old instance..."
        Invoke-RestMethod -Method Delete -Uri "http://localhost:8080/instance/delete/$instanceName" -Headers $headers -ErrorAction SilentlyContinue
    }
    catch { Write-Host "Delete failed (maybe didn't exist)." }

    Start-Sleep -Seconds 2

    # 2. CREATE new instance
    Write-Host "Creating new instance..."
    $body = @{
        instanceName = $instanceName
        token        = "123456"
        qrcode       = $true
        integration  = "WHATSAPP-BAILEYS"
    } | ConvertTo-Json

    $createResponse = Invoke-RestMethod -Method Post -Uri "http://localhost:8080/instance/create" -Headers $headers -ContentType "application/json" -Body $body
    
    # Poll for QR Code (Max 60s)
    $maxRetries = 12 
    $qrBase64 = $null

    for ($i = 1; $i -le $maxRetries; $i++) {
        Write-Host "Polling for QR ($i/$maxRetries)..."
        try {
            $connectResponse = Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/$instanceName" -Headers $headers -ErrorAction SilentlyContinue
            
            if ($connectResponse.base64) {
                $qrBase64 = $connectResponse.base64
                Write-Host "QR Code captured!"
                break
            }
            if ($connectResponse.qrcode.base64) {
                $qrBase64 = $connectResponse.qrcode.base64
                Write-Host "QR Code captured!"
                break
            }
        }
        catch { Write-Host "Poll error: $_" }
        
        Start-Sleep -Seconds 5
    }

    if ($qrBase64) {
        $htmlContent = "<html><body style='background-color: #111; color: white; text-align: center; padding-top: 50px;'><h1>Scan via WhatsApp</h1><img src='$qrBase64' style='border: 10px solid white; border-radius: 10px;'/><br><br><h2>Instance: $instanceName</h2></body></html>"
        Set-Content -Path "c:\Users\elmae\proyecto-envios\automation\qr.html" -Value $htmlContent
        Write-Host "SUCCESS: qr.html generated."
    }
    else {
        Write-Host "ERROR: Timeout waiting for QR code."
        Write-Host "Last status: $($connectResponse | ConvertTo-Json -Depth 5)"
    }
}
catch {
    Write-Host "CRITICAL ERROR: $_"
}
