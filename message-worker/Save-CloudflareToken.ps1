$ErrorActionPreference = 'Stop'
$tokenPath = Join-Path $PSScriptRoot '.cloudflare-token.dpapi'
$secret = Read-Host 'Paste the scoped Cloudflare API Token (input hidden)' -AsSecureString
$pointer = [IntPtr]::Zero
try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secret)
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringUni($pointer)
    if ($plain.Length -lt 20 -or $plain.Length -gt 1024 -or $plain.Contains("`r") -or $plain.Contains("`n")) {
        throw 'Invalid token format.'
    }
    $verification = Invoke-RestMethod -Method Get -Uri 'https://api.cloudflare.com/client/v4/user/tokens/verify' -Headers @{ Authorization = "Bearer $plain" } -TimeoutSec 20
    if (-not $verification.success -or $verification.result.status -ne 'active') {
        throw 'Token is not active.'
    }
    $secret | ConvertFrom-SecureString | Set-Content -LiteralPath $tokenPath -Encoding UTF8
    Write-Host 'Token verified and saved with Windows DPAPI encryption. Tell the assistant: token saved.'
} catch {
    Write-Host 'Token was not saved. Check the token permissions or network, then try again.'
    exit 1
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($pointer) }
    $plain = $null
    $secret.Dispose()
}
