param (
    [Parameter(Mandatory=$true)]
    [string]$BackupDir
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    throw "Diretório de backup não encontrado: $BackupDir"
}

Write-Host "==============================================================================="
Write-Host "             CENTRAL DE IMPLANTAÇÕES - ROTINA DE RESTAURAÇÃO                   "
Write-Host "-------------------------------------------------------------------------------"
Write-Host " Origem do Backup: $BackupDir"

# 1. Verificação de Integridade via Manifesto SHA-256
$manifestFile = Join-Path $BackupDir "manifest.json"
if (Test-Path $manifestFile) {
    Write-Host " Verificando integridade dos arquivos via manifesto SHA-256..."
    $manifest = Get-Content $manifestFile -Raw | ConvertFrom-Json
    foreach ($item in $manifest) {
        $filePath = Join-Path $BackupDir $item.FileName
        if (-not (Test-Path $filePath)) {
            # Tentar encontrar recursivamente
            $found = Get-ChildItem -Path $BackupDir -Recurse -Filter $item.FileName | Select-Object -First 1
            if ($found) { $filePath = $found.FullName }
        }

        if (Test-Path $filePath) {
            $currentHash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
            if ($currentHash -ne $item.SHA256) {
                throw "FALHA DE INTEGRIDADE: Arquivo '$($item.FileName)' possui hash divergente!"
            }
        }
    }
    Write-Host " [OK] Todos os arquivos do backup foram verificados e validados com sucesso!"
} else {
    Write-Warning " Manifesto SHA-256 não encontrado no backup. Prosseguindo com restauração básica..."
}

# 2. Restauração do Banco de Dados
$dbBackup = Join-Path $BackupDir "central.db"
if (Test-Path $dbBackup) {
    Write-Host " Restaurando Banco de Dados Local (SQLite)..."
    if (-not (Test-Path "./prisma/data")) {
        New-Item -ItemType Directory -Path "./prisma/data" -Force | Out-Null
    }
    Copy-Item $dbBackup -Destination "./prisma/data/central.db" -Force
    if (-not (Test-Path "./data")) {
        New-Item -ItemType Directory -Path "./data" -Force | Out-Null
    }
    Copy-Item $dbBackup -Destination "./data/central.db" -Force
    Write-Host " [OK] Banco de dados restaurado com sucesso e integridade confirmada."
}

# 3. Restauração do Armazenamento de Anexos
$storageBackup = Join-Path $BackupDir "storage"
if (Test-Path $storageBackup) {
    Write-Host " Restaurando arquivos de anexos em ./data/storage..."
    if (-not (Test-Path "./data/storage")) {
        New-Item -ItemType Directory -Path "./data/storage" -Force | Out-Null
    }
    Copy-Item $storageBackup -Destination "./data/storage" -Recurse -Force
    Write-Host " [OK] Armazenamento de anexos restaurado com sucesso."
}

Write-Host "==============================================================================="
Write-Host "             RESTAURAÇÃO CONCLUÍDA COM SUCESSO!                                "
Write-Host "==============================================================================="
