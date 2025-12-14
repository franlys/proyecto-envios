$headers = @{ 
    apikey = "429683C4C977415CAAFCCE10F7D57E11" 
}
$url = "https://evolution-api-production-0fa7.up.railway.app/instance/fetchInstances"

Write-Host "Testing Connection to: $url"
try {
    # Added -UseBasicParsing to prevent IE engine requirement prompts
    $response = Invoke-WebRequest -Uri $url -Headers $headers -ErrorAction Stop -UseBasicParsing
    Write-Host "STATUS: $($response.StatusCode)"
    Write-Host "CONTENT: $($response.Content)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        Write-Host "Response Status: $($_.Exception.Response.StatusCode)"
        # Use simple stream reading for error response
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
