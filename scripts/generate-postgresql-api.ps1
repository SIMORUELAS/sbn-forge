param(
  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Table,

  [ValidateNotNullOrEmpty()]
  [string]$Schema = "public",

  [ValidateNotNullOrEmpty()]
  [string]$HostName = "localhost",

  [ValidateRange(1, 65535)]
  [int]$Port = 5432,

  [Parameter(Mandatory = $true)]
  [ValidateNotNullOrEmpty()]
  [string]$Database,

  [ValidateNotNullOrEmpty()]
  [string]$User = "postgres",

  [string]$Password =
    $env:SBN_POSTGRES_PASSWORD,

  [ValidateNotNullOrEmpty()]
  [string]$Profile = "sbn-api-v2",

  [ValidateNotNullOrEmpty()]
  [string]$Output = ".\output",

  [ValidateNotNullOrEmpty()]
  [string]$DefinitionsDirectory =
    ".\examples",

  [switch]$Force,

  [switch]$SkipTests,

  [switch]$SkipLint
)

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Configuración UTF-8
# ---------------------------------------------------------------------------

[Console]::InputEncoding =
  [System.Text.UTF8Encoding]::new(
    $false
  )

[Console]::OutputEncoding =
  [System.Text.UTF8Encoding]::new(
    $false
  )

$OutputEncoding =
  [System.Text.UTF8Encoding]::new(
    $false
  )

try {
  chcp 65001 |
    Out-Null
}
catch {
  # No interrumpir el proceso si chcp
  # no está disponible.
}

# ---------------------------------------------------------------------------
# Funciones auxiliares
# ---------------------------------------------------------------------------

function Write-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message
  )

  Write-Host ""
  Write-Host (
    "============================================================"
  )

  Write-Host $Message

  Write-Host (
    "============================================================"
  )
}

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,

    [Parameter(Mandatory = $true)]
    [object[]]$Arguments,

    [Parameter(Mandatory = $true)]
    [string]$ErrorMessage
  )

  & $Command @Arguments

  if (
    $LASTEXITCODE -ne 0
  ) {
    throw (
      "$ErrorMessage Código de salida: " +
      "$LASTEXITCODE."
    )
  }
}

function Read-JsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  return (
    Get-Content `
      -LiteralPath $Path `
      -Raw `
      -Encoding utf8 |
    ConvertFrom-Json
  )
}

function Write-JsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [object]$Value,

    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  $json =
    $Value |
    ConvertTo-Json `
      -Depth 100

  [System.IO.File]::WriteAllText(
    $Path,
    $json,
    [System.Text.UTF8Encoding]::new(
      $false
    )
  )
}

# ---------------------------------------------------------------------------
# Proceso principal
# ---------------------------------------------------------------------------

try {
  $forgeRoot =
    Split-Path `
      -Parent `
      $PSScriptRoot

  if (
    [string]::IsNullOrWhiteSpace(
      $forgeRoot
    )
  ) {
    throw (
      "No fue posible determinar la raíz " +
      "de SBN Forge."
    )
  }

  Set-Location `
    -LiteralPath $forgeRoot

  if (
    [string]::IsNullOrWhiteSpace(
      $Password
    )
  ) {
    throw @"
No se proporcionó la contraseña de PostgreSQL.

Puedes enviarla así:

-Password "TU_CONTRASEÑA"

O definirla antes de ejecutar:

`$env:SBN_POSTGRES_PASSWORD = "TU_CONTRASEÑA"
"@
  }

  $definitionDirectory =
    if (
      [System.IO.Path]::IsPathRooted(
        $DefinitionsDirectory
      )
    ) {
      [System.IO.Path]::GetFullPath(
        $DefinitionsDirectory
      )
    }
    else {
      [System.IO.Path]::GetFullPath(
        (
          Join-Path `
            $forgeRoot `
            $DefinitionsDirectory
        )
      )
    }

  $outputDirectory =
    if (
      [System.IO.Path]::IsPathRooted(
        $Output
      )
    ) {
      [System.IO.Path]::GetFullPath(
        $Output
      )
    }
    else {
      [System.IO.Path]::GetFullPath(
        (
          Join-Path `
            $forgeRoot `
            $Output
        )
      )
    }

  New-Item `
    -ItemType Directory `
    -Path $definitionDirectory `
    -Force |
  Out-Null

  New-Item `
    -ItemType Directory `
    -Path $outputDirectory `
    -Force |
  Out-Null

  $definitionFile =
    Join-Path `
      $definitionDirectory `
      "$Table.json"

  $moduleName =
    $Table.Replace(
      "_",
      "-"
    )

  $moduleDirectory =
    Join-Path `
      $outputDirectory `
      "modules\$moduleName"

  # -------------------------------------------------------------------------
  # Preservar datos funcionales personalizados
  # -------------------------------------------------------------------------

  $existingSeeds =
    @()

  if (
    Test-Path `
      -LiteralPath $definitionFile
  ) {
    try {
      $existingDefinition =
        Read-JsonFile `
          -Path $definitionFile

      if (
        $null -ne
          $existingDefinition.seeds
      ) {
        $existingSeeds =
          @(
            $existingDefinition.seeds
          )

        Write-Host (
          "Seeds existentes detectados: " +
          $existingSeeds.Count
        )
      }
    }
    catch {
      Write-Warning (
        "No fue posible leer la definición " +
        "anterior para preservar sus seeds."
      )
    }
  }

  # -------------------------------------------------------------------------
  # 1. Inspección PostgreSQL
  # -------------------------------------------------------------------------

  Write-Step `
    "1. Inspeccionando PostgreSQL: $Schema.$Table"

  $inspectArguments = @(
    ".\bin\sbn-forge.js",
    "inspect",
    "postgresql",
    $Table,
    "--schema",
    $Schema,
    "--output",
    $definitionFile,
    "--host",
    $HostName,
    "--port",
    [string]$Port,
    "--database",
    $Database,
    "--user",
    $User,
    "--password",
    $Password
  )

  Invoke-CheckedCommand `
    -Command "node" `
    -Arguments $inspectArguments `
    -ErrorMessage (
      "Falló la inspección PostgreSQL."
    )

  if (
    -not (
      Test-Path `
        -LiteralPath $definitionFile
    )
  ) {
    throw (
      "No se generó la definición: " +
      $definitionFile
    )
  }

  # -------------------------------------------------------------------------
  # Restaurar seeds después de la inspección
  # -------------------------------------------------------------------------

  if (
    $existingSeeds.Count -gt 0
  ) {
    $inspectedDefinition =
      Read-JsonFile `
        -Path $definitionFile

    $inspectedDefinition |
      Add-Member `
        -MemberType NoteProperty `
        -Name "seeds" `
        -Value $existingSeeds `
        -Force

    Write-JsonFile `
      -Value $inspectedDefinition `
      -Path $definitionFile

    Write-Host (
      "Seeds restaurados en la definición: " +
      $existingSeeds.Count
    )
  }
  else {
    Write-Host (
      "La definición no contiene seeds " +
      "personalizados para preservar."
    )
  }

  # -------------------------------------------------------------------------
  # 2. Validación del JSON
  # -------------------------------------------------------------------------

  Write-Step `
    "2. Validando JSON generado"

  $definition =
    Read-JsonFile `
      -Path $definitionFile

  if (
    [string]::IsNullOrWhiteSpace(
      $definition.schema
    )
  ) {
    throw (
      "La definición generada no contiene schema."
    )
  }

  if (
    [string]::IsNullOrWhiteSpace(
      $definition.table
    )
  ) {
    throw (
      "La definición generada no contiene table."
    )
  }

  if (
    $null -eq $definition.columns -or
    $definition.columns.Count -eq 0
  ) {
    throw (
      "La definición generada no contiene columnas."
    )
  }

  Write-Host (
    "Definición válida: $definitionFile"
  )

  Write-Host (
    "Schema:   $($definition.schema)"
  )

  Write-Host (
    "Tabla:    $($definition.table)"
  )

  Write-Host (
    "Columnas: $($definition.columns.Count)"
  )

  $seedCount = 0

  if (
    $null -ne $definition.seeds
  ) {
    $seedCount =
      @(
        $definition.seeds
      ).Count
  }

  Write-Host (
    "Seeds:    $seedCount"
  )

  # -------------------------------------------------------------------------
  # 3. Generación del módulo
  # -------------------------------------------------------------------------

  Write-Step `
    "3. Generando módulo con perfil $Profile"

  $generateArguments = @(
    ".\bin\sbn-forge.js",
    "generate",
    "api",
    $Table,
    "--profile",
    $Profile,
    "--definition",
    $definitionFile,
    "--output",
    $outputDirectory
  )

  if (
    $Force
  ) {
    $generateArguments +=
      "--force"
  }

  Invoke-CheckedCommand `
    -Command "node" `
    -Arguments $generateArguments `
    -ErrorMessage (
      "Falló la generación del módulo."
    )

  if (
    -not (
      Test-Path `
        -LiteralPath $moduleDirectory
    )
  ) {
    throw (
      "No se generó el directorio del módulo: " +
      $moduleDirectory
    )
  }

  $manifestFile =
    Join-Path `
      $moduleDirectory `
      "sbn-forge.manifest.json"

  if (
    -not (
      Test-Path `
        -LiteralPath $manifestFile
    )
  ) {
    throw (
      "No se generó el manifest del módulo: " +
      $manifestFile
    )
  }

  # -------------------------------------------------------------------------
  # 4. Pruebas
  # -------------------------------------------------------------------------

  if (
    -not $SkipTests
  ) {
    Write-Step `
      "4. Ejecutando pruebas"

    Invoke-CheckedCommand `
      -Command "npm" `
      -Arguments @(
        "test"
      ) `
      -ErrorMessage (
        "Las pruebas fallaron."
      )
  }
  else {
    Write-Host ""
    Write-Host (
      "Pruebas omitidas por -SkipTests."
    )
  }

  # -------------------------------------------------------------------------
  # 5. ESLint
  # -------------------------------------------------------------------------

  if (
    -not $SkipLint
  ) {
    Write-Step `
      "5. Ejecutando ESLint"

    Invoke-CheckedCommand `
      -Command "npm" `
      -Arguments @(
        "run",
        "lint"
      ) `
      -ErrorMessage (
        "ESLint encontró errores."
      )
  }
  else {
    Write-Host ""
    Write-Host (
      "ESLint omitido por -SkipLint."
    )
  }

  # -------------------------------------------------------------------------
  # Resumen final
  # -------------------------------------------------------------------------

  Write-Step `
    "Proceso completado correctamente"

  Write-Host (
    "Tabla:      $Schema.$Table"
  )

  Write-Host (
    "Definición: $definitionFile"
  )

  Write-Host (
    "Módulo:     $moduleDirectory"
  )

  Write-Host (
    "Perfil:     $Profile"
  )

  Write-Host (
    "Manifest:   $manifestFile"
  )

  Write-Host ""
  Write-Host "Archivos generados:"

  
  if (
  Test-Path `
    -LiteralPath $moduleDirectory
) {

  Get-ChildItem `
    -LiteralPath $moduleDirectory `
    -Recurse `
    -File |
  Sort-Object FullName |
  ForEach-Object {

    $relativePath =
      $_.FullName.Substring(
        $moduleDirectory.Length
      ).TrimStart(
        [char]'\',
        [char]'/'
      )

    Write-Host (
      "  [ok] $relativePath"
    )
  }

}
else {

  Write-Warning (
    "No existe el directorio del módulo: " +
    $moduleDirectory
  )

}





  exit 0
}
catch {
  Write-Host ""
  Write-Host (
    "SBN Forge automation error:"
  ) `
    -ForegroundColor Red

  Write-Host (
    $_.Exception.Message
  ) `
    -ForegroundColor Red

  exit 1
}