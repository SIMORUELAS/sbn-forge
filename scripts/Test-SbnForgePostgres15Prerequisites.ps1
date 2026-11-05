#requires -Version 5.1
<#
.SYNOPSIS
  Read-only Windows prerequisites for a dedicated PostgreSQL 15 Forge Test cluster.
.DESCRIPTION
  Never creates files, directories, services, databases, roles, firewall rules or permissions.
  Prints bounded status codes, not credentials. A successful diagnostic is NOT authorization.
#>
[CmdletBinding()]
param(
    [string]$Bin = 'C:\Program Files\PostgreSQL\15\bin',
    [string]$DataPath = 'C:\SBN\PostgreSQL15-Forge-Test',
    [string]$ServiceName = 'postgresql-sbn-forge-test',
    [ValidateRange(1,65535)][int]$Port = 5433
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$checks = New-Object 'System.Collections.Generic.List[object]'
function Add-Check([string]$Name,[bool]$Pass,[string]$Detail) {
    $checks.Add([pscustomobject]@{ Check=$Name; Status=$(if($Pass){'PASS'}else{'BLOCKED'}); Detail=$Detail })
}
try {
    $required = @('initdb.exe','pg_ctl.exe','psql.exe','pg_controldata.exe')
    foreach ($name in $required) {
        Add-Check "binary:$name" (Test-Path -LiteralPath (Join-Path $Bin $name) -PathType Leaf) 'Required PostgreSQL 15 executable'
    }
    $existing = Get-CimInstance Win32_Service -Filter "Name='postgresql-x64-15'" -ErrorAction Stop
    Add-Check 'existing-cluster-service' ($null -ne $existing -and $existing.State -eq 'Running') 'Existing cluster must remain running'
    $newService = Get-CimInstance Win32_Service -Filter "Name='$($ServiceName.Replace("'","''"))'" -ErrorAction Stop
    Add-Check 'new-service-name-available' ($null -eq $newService) 'Must not overwrite an existing Windows service'
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object { $_.LocalPort -eq $Port })
    Add-Check 'new-port-available' ($listeners.Count -eq 0) 'Port must have no IPv4 or IPv6 listener'
    Add-Check 'new-data-directory-absent' (-not (Test-Path -LiteralPath $DataPath)) 'Must not reuse or overwrite a data directory'
    $parent = Split-Path -Parent $DataPath
    $ancestor = $parent
    while ($ancestor -and -not (Test-Path -LiteralPath $ancestor)) {
        $ancestor = Split-Path -Parent $ancestor
    }
    $reparse = $false
    if ($ancestor) {
        $current = $ancestor
        while ($current) {
            $item = Get-Item -LiteralPath $current -Force
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { $reparse = $true }
            $next = Split-Path -Parent $current
            if ($next -eq $current) { break }
            $current = $next
        }
    }
    Add-Check 'existing-ancestor-not-reparse' (-not $reparse) 'No existing ancestor may be a junction/symlink'
    Add-Check 'dedicated-service-account-review' $false 'Requires independent review of Windows identity, service logon rights and NTFS ACLs'
    Add-Check 'host-and-backup-review' $false 'Requires independent confirmation of disk, recovery plan and host security'
} catch {
    Add-Check 'diagnostic-execution' $false 'Could not complete all read-only checks; inspect Windows permissions and prerequisites'
}
$checks | Format-Table -AutoSize | Out-String -Width 220 | Write-Output
$blocked = @($checks | Where-Object Status -eq 'BLOCKED').Count
[pscustomobject]@{
    Status = 'PREFLIGHT_ONLY_NOT_AUTHORIZED'
    BlockedChecks = $blocked
    InstallationAuthorized = $false
    InstallationPerformed = $false
    DatabaseModified = $false
} | ConvertTo-Json -Compress | Write-Output
# Intentional: never return installation-ready automatically. Human approval remains mandatory.
