import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Windows setup accepts QQ number, complete address, full-width text, and retries invalid input', { skip: process.platform !== 'win32' }, () => {
  const path = fileURLToPath(new URL('../Save-MessageSecrets.ps1', import.meta.url));
  const quote = text => `'${text.replaceAll("'", "''")}'`;
  for (const entries of [['123456'], [' 123456@QQ.COM '], ['１２３４５６＠ｑｑ．ｃｏｍ'], ['not-an-email', '123456']]) {
    const script = `
      $global:qaInputs = [Collections.Generic.Queue[string]]::new()
      @(${entries.map(quote).join(',')}) | ForEach-Object { $global:qaInputs.Enqueue($_) }
      $global:qaSecretReached = $false
      $global:qaNormalized = ''
      function Read-Host {
        param([string]$Prompt, [switch]$AsSecureString)
        if ($AsSecureString) {
          $global:qaSecretReached = $true
          $global:qaNormalized = Get-Variable -Name email -Scope 1 -ValueOnly
          throw 'QA_STOP_BEFORE_ANY_SECRET'
        }
        if (-not $global:qaInputs.Count) { throw 'Unexpected extra prompt' }
        return $global:qaInputs.Dequeue()
      }
      try { & ${quote(path)} } catch {
        if ($_.Exception.Message -ne 'QA_STOP_BEFORE_ANY_SECRET') { throw }
      }
      if (-not $global:qaSecretReached -or $global:qaNormalized -cne '123456@qq.com') {
        throw 'QQ address did not reach secret entry in normalized form'
      }
      exit 0
    `;
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { encoding: 'utf8', timeout: 10_000 });
    assert.equal(result.status, 0, result.stderr || result.stdout || result.error?.message);
  }
});
