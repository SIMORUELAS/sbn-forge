#requires -Version 5.1
<#
.SYNOPSIS
  Approval-gated, read-only orchestration for a proposed isolated PostgreSQL 15 test cluster.
.DESCRIPTION
  This version deliberately has NO installation mode. It never changes host or database state.
  It runs the existing prerequisite and security diagnostics and fails closed on any blocked check.
#>
[CmdletBinding()]
param(
  [ValidateSet('Plan','Preflight')][string]$Mode = 'Plan'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$diagnostics = @(
  (Join-Path $PSScriptRoot 'Test-SbnForgePostgres15Prerequisites.ps1'),
  (Join-Path $PSScriptRoot 'Test-SbnForgePostgres15SecurityReadiness.ps1')
)
$manifest = [ordered]@{
  Mode = $Mode
  Status = 'NOT_AUTHORIZED'
  ExistingService = 'postgresql-x64-15'
  ExistingPort = 5432
  ProposedService = 'postgresql-sbn-forge-test'
  ProposedPort = 5433
  ProposedDataPath = 'C:\SBN\PostgreSQL15-Forge-Test'
  ProposedDatabase = 'sbn_forge_execution_test'
  ProvisioningAuthorized = $false
  ProvisioningPerformed = $false
  TestExecutionAuthorized = $false
}
if ($Mode -eq 'Plan') {
  $manifest['RequiredApprovalGates'] = @('service-account-and-ntfs','backup-and-recovery','network-and-scram','explicit-installation-authorization')
  $manifest | ConvertTo-Json -Depth 4
  return
}
$results = @()
foreach ($diagnostic in $diagnostics) {
  if (-not (Test-Path -LiteralPath $diagnostic -PathType Leaf)) {
    $manifest['Status'] = 'BLOCKED_MISSING_DIAGNOSTIC'
    $manifest['MissingDiagnostic'] = Split-Path -Leaf $diagnostic
    $manifest | ConvertTo-Json -Depth 4
    return
  }
  try {
    $output = @(& $diagnostic)
    $last = $output | Select-Object -Last 1
    $parsed = $last | ConvertFrom-Json -ErrorAction Stop
    $results += [pscustomobject]@{
      Diagnostic = Split-Path -Leaf $diagnostic
      Status = [string]$parsed.Status
      BlockedChecks = [int]$parsed.BlockedChecks
    }
  } catch {
    $manifest['Status'] = 'BLOCKED_DIAGNOSTIC_ERROR'
    $manifest['FailedDiagnostic'] = Split-Path -Leaf $diagnostic
    $manifest | ConvertTo-Json -Depth 4
    return
  }
}
$manifest['Status'] = 'BLOCKED_ADMINISTRATIVE_APPROVALS'
$manifest['Diagnostics'] = $results
$manifest | ConvertTo-Json -Depth 5
# No mutation or installer branch exists in this script, even when diagnostics pass.
