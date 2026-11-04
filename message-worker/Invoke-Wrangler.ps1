param([Parameter(ValueFromRemainingArguments = $true)][string[]]$WranglerArguments)
$ErrorActionPreference = 'Stop'
$tokenPath = Join-Path $PSScriptRoot '.cloudflare-token.dpapi'
if (-not (Test-Path -LiteralPath $tokenPath -PathType Leaf)) { throw 'Run Save-CloudflareToken.ps1 first.' }
$secret = (Get-Content -LiteralPath $tokenPath -Raw).Trim() | ConvertTo-SecureString
$pointer = [IntPtr]::Zero
$previousToken = $env:CLOUDFLARE_API_TOKEN
try {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secret)
    $env:CLOUDFLARE_API_TOKEN = [Runtime.InteropServices.Marshal]::PtrToStringUni($pointer)
    Push-Location -LiteralPath $PSScriptRoot
    try {
        & npx.cmd wrangler @WranglerArguments
        $commandExit = $LASTEXITCODE
    } finally { Pop-Location }
} finally {
    $env:CLOUDFLARE_API_TOKEN = $previousToken
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($pointer) }
    $secret.Dispose()
}
exit $commandExit
