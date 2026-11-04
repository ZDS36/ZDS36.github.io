$ErrorActionPreference = 'Stop'
$configPath = Join-Path $PSScriptRoot '.message-secrets.dpapi'
do {
    $email = Read-Host '先输入收件 QQ 邮箱或纯 QQ 号（例如 123456@qq.com 或 123456，此处不要填授权码）'
    $email = $email.Trim().Normalize([System.Text.NormalizationForm]::FormKC).ToLowerInvariant()
    if ($email -match '^[0-9]+$') { $email += '@qq.com' }
    $validEmail = $email -match '^[0-9]+@qq\.com$'
    if (-not $validEmail) { Write-Host '邮箱格式不正确，请重输 QQ 号或完整数字 QQ 邮箱。' -ForegroundColor Yellow }
} while (-not $validEmail)
Write-Host '接下来输入 QQ 邮箱生成的 SMTP 专用授权码，不是 QQ 登录密码。'
$smtpSecret = Read-Host 'QQ SMTP 授权码（隐藏输入）' -AsSecureString
$turnstileSecret = Read-Host 'Turnstile Secret Key（隐藏输入，不是公开的 Site Key）' -AsSecureString
$smtpPointer = [IntPtr]::Zero
$turnstilePointer = [IntPtr]::Zero
$protectedPayload = $null
$previousPayload = $null
$previousPointer = [IntPtr]::Zero
try {
    $smtpPointer = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($smtpSecret)
    $turnstilePointer = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($turnstileSecret)
    $smtpPlain = [Runtime.InteropServices.Marshal]::PtrToStringUni($smtpPointer)
    $turnstilePlain = [Runtime.InteropServices.Marshal]::PtrToStringUni($turnstilePointer)
    if ($smtpPlain.Length -lt 8 -or $smtpPlain.Length -gt 256 -or $smtpPlain -match '[\r\n]') { throw 'Invalid SMTP code format.' }
    if ($turnstilePlain.Length -lt 30 -or $turnstilePlain.Length -gt 256 -or $turnstilePlain -match '[\r\n]') { throw 'Enter the Secret Key, not the public Site Key.' }
    if (Test-Path -LiteralPath $configPath -PathType Leaf) {
        $previousPayload = (Get-Content -LiteralPath $configPath -Raw).Trim() | ConvertTo-SecureString
        $previousPointer = [Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($previousPayload)
        $previousData = [Runtime.InteropServices.Marshal]::PtrToStringUni($previousPointer) | ConvertFrom-Json
        $hashSecret = $previousData.IP_HASH_SECRET
        if ($hashSecret -notmatch '^[a-f0-9]{64}$') { throw 'Existing IP counter key is invalid; refusing to reset it.' }
    } else {
        $randomBytes = New-Object byte[] 32
        $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
        $hashSecret = -join ($randomBytes | ForEach-Object { $_.ToString('x2') })
    }
    $payload = @{ SMTP_USER = $email; SMTP_PASSWORD = $smtpPlain; TURNSTILE_SECRET = $turnstilePlain; IP_HASH_SECRET = $hashSecret } | ConvertTo-Json -Compress
    $protectedPayload = ConvertTo-SecureString $payload -AsPlainText -Force
    $protectedPayload | ConvertFrom-SecureString | Set-Content -LiteralPath $configPath -Encoding UTF8
    Write-Host '收件配置已通过 Windows 加密保存，没有发送邮件。请回到聊天回复：收件配置已保存。'
} catch {
    Write-Host '配置未保存。请确认输入了 QQ SMTP 专用授权码和 Turnstile Secret Key，且没有多余换行。'
    exit 1
} finally {
    if ($smtpPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($smtpPointer) }
    if ($turnstilePointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($turnstilePointer) }
    if ($previousPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($previousPointer) }
    $smtpPlain = $null; $turnstilePlain = $null; $payload = $null; $hashSecret = $null; $previousData = $null
    $smtpSecret.Dispose(); $turnstileSecret.Dispose()
    if ($protectedPayload) { $protectedPayload.Dispose() }
    if ($previousPayload) { $previousPayload.Dispose() }
}
