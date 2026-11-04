param([Parameter(Mandatory = $true)][ValidatePattern('^[a-f0-9]{32}$')][string]$AccountId)
$ErrorActionPreference = 'Stop'
$tokenPath = Join-Path $PSScriptRoot '.cloudflare-token.dpapi'
$configPath = Join-Path $PSScriptRoot '.message-secrets.dpapi'
if (-not (Test-Path -LiteralPath $tokenPath -PathType Leaf) -or -not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    throw 'Save the deployment token and message secrets on this Windows account first.'
}
$token = (Get-Content -LiteralPath $tokenPath -Raw).Trim() | ConvertTo-SecureString
$config = (Get-Content -LiteralPath $configPath -Raw).Trim() | ConvertTo-SecureString
$tokenPointer = [IntPtr]::Zero
$configPointer = [IntPtr]::Zero
try {
    $tokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($token)
    $configPointer = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($config)
    $tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringUni($tokenPointer)
    $values = [Runtime.InteropServices.Marshal]::PtrToStringUni($configPointer) | ConvertFrom-Json
    $names = @('SMTP_USER', 'SMTP_PASSWORD', 'TURNSTILE_SECRET', 'IP_HASH_SECRET')
    foreach ($name in $names) { if (-not $values.$name) { throw 'Required message configuration is missing.' } }
    foreach ($name in $names) {
        $body = @{ name = $name; text = $values.$name; type = 'secret_text' } | ConvertTo-Json -Compress
        $response = Invoke-RestMethod -Method Put -Uri "https://api.cloudflare.com/client/v4/accounts/$AccountId/workers/scripts/between-states-messages/secrets" -Headers @{ Authorization = "Bearer $tokenPlain" } -ContentType 'application/json' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 30
        if (-not $response.success) { throw 'Cloudflare rejected a secret update.' }
        Write-Host "Configured $name (value hidden)."
    }
} catch {
    Write-Host 'Message secret upload failed; values were hidden. The website has not been switched.'
    exit 1
} finally {
    if ($tokenPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($tokenPointer) }
    if ($configPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($configPointer) }
    $tokenPlain = $null; $values = $null; $body = $null
    $token.Dispose(); $config.Dispose()
}
