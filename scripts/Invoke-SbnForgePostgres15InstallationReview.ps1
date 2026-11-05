#requires -Version 5.1
<#
.SYNOPSIS
  Offline, read-only installation package review for the proposed Forge Test cluster.
.DESCRIPTION
  No Install switch exists. This script never provisions accounts, files, services,
  credentials, databases, ACLs or firewall rules. Administrative values are
  deliberately required in a separate approved change record, not this repository.
#>
[CmdletBinding()]
param(
  [ValidateSet('Manifest','Review')][string]$Mode = 'Review'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$steps = @(
  [pscustomobject]@{Order=1;Stage='Windows identity';Operation='Select dedicated non-admin account and approve service logon';Gate='Identity and credential policy approval'},
  [pscustomobject]@{Order=2;Stage='NTFS';Operation='Create exclusive data/log directories with approved ACLs';Gate='Exact owner, ACL and paths approval'},
  [pscustomobject]@{Order=3;Stage='initdb';Operation='Initialize separate PostgreSQL 15 cluster with SCRAM';Gate='Dedicated identity and secure credential delivery'},
  [pscustomobject]@{Order=4;Stage='Network';Operation='Configure port 5433, loopback-only and narrow pg_hba.conf';Gate='Listener and authentication approval'},
  [pscustomobject]@{Order=5;Stage='Windows service';Operation='Register and start only postgresql-sbn-forge-test';Gate='Service identity and change-window approval'},
  [pscustomobject]@{Order=6;Stage='SQL';Operation='Create test database, restricted runner and independently owned disabled marker';Gate='Privileges and endpoint approval'},
  [pscustomobject]@{Order=7;Stage='Verification';Operation='Check new instance and unchanged original 5432 baseline';Gate='Read-only evidence review'}
)
$required = @(
  'approved-service-account',
  'approved-ntfs-owner-and-acls',
  'approved-backup-retention-and-restore',
  'approved-secret-delivery',
  'approved-listen-addresses-and-pg-hba',
  'approved-sql-role-and-marker-owner',
  'approved-operator-maintenance-window-and-rollback',
  'explicit-installation-authorization'
)
$report = [ordered]@{
  Mode = $Mode
  Status = 'INSTALLATION_NOT_AUTHORIZED'
  ExistingService = 'postgresql-x64-15'
  ExistingPort = 5432
  ProposedService = 'postgresql-sbn-forge-test'
  ProposedPort = 5433
  ProposedDataPath = 'C:\SBN\PostgreSQL15-Forge-Test'
  ProposedDatabase = 'sbn_forge_execution_test'
  ProposedRunner = 'sbn_forge_test_runner'
  MissingApprovals = $required
  ProvisioningAuthorized = $false
  ProvisioningPerformed = $false
  TestExecutionAuthorized = $false
}
if ($Mode -eq 'Manifest') { $report['Stages'] = $steps }
else {
  $report['StageCount'] = $steps.Count
  $report['Review'] = 'All eight approvals require independent evidence; no automatic promotion to Install'
}
$report | ConvertTo-Json -Depth 6
