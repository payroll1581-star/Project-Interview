<#
.SYNOPSIS
  Registers the Interview Management System to start at boot, back up nightly, and accept
  connections from the local network on Windows.

.DESCRIPTION
  Run from an elevated (Administrator) PowerShell in a deployed copy of the project
  (dependencies installed, "npm run build" done, .env filled in -- see README.md).
  Creates two scheduled tasks and one firewall rule:
    InterviewApp-Server  runs "node scripts/start-prod.mjs" at startup, restarting on failure
    InterviewApp-Backup  runs "node server/backup.js" every day at -BackupTime
    InterviewApp-Port    allows inbound TCP on -Port from the local subnet only (Private/Domain networks)
  Use -WhatIf to see what would happen without changing anything, and -Remove to undo it all.

.PARAMETER AppDir     Project folder. Defaults to the folder above this script's "scripts" directory.
.PARAMETER Port       Must match PORT in .env (3001 if unset).
.PARAMETER BackupTime Local time of the daily backup, e.g. "02:00".
#>
#Requires -RunAsAdministrator
[CmdletBinding(SupportsShouldProcess = $true)]
param(
  [string]$AppDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
  [int]$Port = 3001,
  [string]$BackupTime = '02:00',
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$serverTask = 'InterviewApp-Server'
$backupTask = 'InterviewApp-Backup'
$firewallRule = 'InterviewApp-Port'

if ($Remove) {
  foreach ($name in @($serverTask, $backupTask)) {
    if (Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue) {
      if ($PSCmdlet.ShouldProcess($name, 'Unregister scheduled task')) {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
      }
    }
  }
  if (Get-NetFirewallRule -DisplayName $firewallRule -ErrorAction SilentlyContinue) {
    if ($PSCmdlet.ShouldProcess($firewallRule, 'Remove firewall rule')) {
      Remove-NetFirewallRule -DisplayName $firewallRule
    }
  }
  return
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
if (-not (Test-Path (Join-Path $AppDir 'dist\index.html'))) {
  throw "dist\index.html not found in $AppDir. Run 'npm run build' first."
}
if (-not (Test-Path (Join-Path $AppDir '.env'))) {
  throw ".env not found in $AppDir. Copy .env.example to .env and fill it in first."
}

# SYSTEM runs whether or not anyone is logged in. It cannot always reach a OneDrive-synced
# folder, which is one more reason to deploy to a plain folder such as C:\InterviewApp.
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

$serverAction = New-ScheduledTaskAction -Execute $node -Argument 'scripts\start-prod.mjs' -WorkingDirectory $AppDir
$serverSettings = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
if ($PSCmdlet.ShouldProcess($serverTask, 'Register scheduled task (at startup)')) {
  Register-ScheduledTask -TaskName $serverTask -Principal $principal -Settings $serverSettings `
    -Action $serverAction -Trigger (New-ScheduledTaskTrigger -AtStartup) -Force | Out-Null
}

$backupAction = New-ScheduledTaskAction -Execute $node -Argument 'server\backup.js' -WorkingDirectory $AppDir
if ($PSCmdlet.ShouldProcess($backupTask, "Register scheduled task (daily at $BackupTime)")) {
  Register-ScheduledTask -TaskName $backupTask -Principal $principal `
    -Action $backupAction -Trigger (New-ScheduledTaskTrigger -Daily -At $BackupTime) -Force | Out-Null
}

if ($PSCmdlet.ShouldProcess($firewallRule, "Allow inbound TCP $Port from the local subnet")) {
  Get-NetFirewallRule -DisplayName $firewallRule -ErrorAction SilentlyContinue | Remove-NetFirewallRule
  New-NetFirewallRule -DisplayName $firewallRule -Direction Inbound -Action Allow -Protocol TCP `
    -LocalPort $Port -RemoteAddress LocalSubnet -Profile Private, Domain | Out-Null
}

Write-Host "Done. Start the server now with: Start-ScheduledTask -TaskName $serverTask"
Write-Host "Then open http://$($env:COMPUTERNAME):$Port from another computer on the same network."
