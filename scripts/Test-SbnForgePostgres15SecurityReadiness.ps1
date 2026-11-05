#requires -Version 5.1
<#
.SYNOPSIS
  Read-only security readiness inventory for the proposed Forge Test PostgreSQL cluster.
.DESCRIPTION
  Does not create identities, files, directories, services or databases.
  Never prints account secrets. Requires human review of Windows ACL and backups.
#>
[CmdletBinding()]
param(
  [string]$DataPath = 'C:\SBN\PostgreSQL15-Forge-Test',
  [string]$ExistingDataPath = 'C:\Program Files\PostgreSQL\15\data',
  [string]$ExistingService = 'postgresql-x64-15',
  [string]$ProposedService = 'postgresql-sbn-forge-test',
  [ValidateRange(1,65535)][int]$Port = 5433,
  [int]$MinimumFreeGiB = 5
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$checks = New-Object 'System.Collections.Generic.List[object]'
function Add-Check([string]$Name,[bool]$Pass,[string]$Detail) {
  $checks.Add([pscustomobject]@{
    Check=$Name; Status=$(if($Pass){'PASS'}else{'BLOCKED'}); Detail=$Detail
  })
}
try {
  $targetFull = [IO.Path]::GetFullPath($DataPath).TrimEnd('\')
  $oldFull = [IO.Path]::GetFullPath($ExistingDataPath).TrimEnd('\')
  $separate = -not ($targetFull.Equals($oldFull,[StringComparison]::OrdinalIgnoreCase) -or
    $targetFull.StartsWith($oldFull+'\',[StringComparison]::OrdinalIgnoreCase) -or
    $oldFull.StartsWith($targetFull+'\',[StringComparison]::OrdinalIgnoreCase))
  Add-Check 'cluster-path-separation' $separate 'New data path must not overlap existing cluster'
  Add-Check 'new-directory-absent' (-not (Test-Path -LiteralPath $targetFull)) 'Existing directories are never reused'
  $old = Get-CimInstance Win32_Service -Filter "Name='$ExistingService'"
  Add-Check 'existing-service-running' ($null -ne $old -and $old.State -eq 'Running') 'Original cluster must stay running'
  $new = Get-CimInstance Win32_Service -Filter "Name='$ProposedService'"
  Add-Check 'new-service-absent' ($null -eq $new) 'Existing service must not be overwritten'
  $listeners = @(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq $Port })
  Add-Check 'port-available' ($listeners.Count -eq 0) 'Both IPv4 and IPv6 listeners inspected'
  $driveRoot = [IO.Path]::GetPathRoot($targetFull)
  $drive = Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq $driveRoot.TrimEnd('\') }
  $enough = $null -ne $drive -and $null -ne $drive.FreeSpace -and
    [double]$drive.FreeSpace -ge ($MinimumFreeGiB * 1GB)
  Add-Check 'minimum-free-space' $enough "At least $MinimumFreeGiB GiB free on target volume (capacity only, not a backup guarantee)"
  $ancestor = Split-Path -Parent $targetFull
  $reparse = $false
  while ($ancestor) {
    if (Test-Path -LiteralPath $ancestor) {
      $item = Get-Item -LiteralPath $ancestor -Force
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { $reparse = $true }
    }
    $next = Split-Path -Parent $ancestor
    if (-not $next -or $next -eq $ancestor) { break }
    $ancestor = $next
  }
  Add-Check 'no-reparse-ancestors' (-not $reparse) 'No junctions or symlinks in existing ancestor path'
  Add-Check 'dedicated-identity-and-acl-approval' $false 'Independent service account, Log on as a service, NTFS ACL review required'
  Add-Check 'backup-and-recovery-approval' $false 'Backup, disk sizing and restore plan require independent approval'
  Add-Check 'network-and-auth-approval' $false 'Local-only listener, SCRAM and pg_hba.conf require independent approval'
} catch {
  Add-Check 'inventory-incomplete' $false 'Read-only Windows inspection failed; stop and review permissions'
}
$checks | Format-Table -AutoSize | Out-String -Width 220 | Write-Output
[pscustomobject]@{
  Status = 'SECURITY_REVIEW_REQUIRED'
  PassedChecks = @($checks | Where-Object Status -eq 'PASS').Count
  BlockedChecks = @($checks | Where-Object Status -eq 'BLOCKED').Count
  ProvisioningAuthorized = $false
  ProvisioningPerformed = $false
} | ConvertTo-Json -Compress | Write-Output
