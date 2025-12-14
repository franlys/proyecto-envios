$headers = @{ apikey = "429683C4C977415CAAFCCE10F7D57E11" }
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8080/instance/connect/Prologix" -Headers $headers
    $response | ConvertTo-Json -Depth 5 | Set-Content "debug_qr.json"
}
catch {
    $_ | Out-File "debug_qr.json"
}
