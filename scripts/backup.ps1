param (
    [string]$OutputDir = "./backups"
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$targetBackupDir = Join-Path $OutputDir "backup_$timestamp"

if (-not (Test-Path $targetBackupDir)) {
    New-Item -ItemType Directory -Path $targetBackupDir -Force | Out-Null
}

Write-Host "==============================================================================="
Write-Host "             CENTRAL DE IMPLANTAÇÕES - ROTINA DE BACKUP                        "
Write-Host "-------------------------------------------------------------------------------"
Write-Host " Destino: $targetBackupDir"

# 1. Backup do Banco de Dados
$envContent = Get-Content ".env" -Raw
$isSqlite = $envContent -match 'DATABASE_URL="file:'

if ($isSqlite) {
    Write-Host " Exportando Banco de Dados Local (SQLite)..."
    $dbSource = if (Test-Path "./prisma/data/central.db") { "./prisma/data/central.db" } else { "./data/central.db" }
    if (Test-Path $dbSource) {
        Copy-Item $dbSource -Destination (Join-Path $targetBackupDir "central.db")
        Write-Host " [OK] Banco SQLite copiado com sucesso de $dbSource."
    } else {
        Write-Warning " Banco SQLite nao encontrado em $dbSource."
    }
} else {
    Write-Host " Exportando Banco de Dados PostgreSQL..."
    $pgDumpDest = Join-Path $targetBackupDir "dump.sql"
    # Executa via docker ou pg_dump se disponivel
    if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
        pg_dump -U postgres -h localhost -d central_implantacoes -F p -f $pgDumpDest
        Write-Host " [OK] Dump SQL gerado via pg_dump."
    } else {
        Write-Host " Exportando snapshot logico do Prisma para contingencia..."
        npx tsx -e "
        import { PrismaClient } from '@prisma/client';
        import fs from 'fs';
        const prisma = new PrismaClient();
        async function run() {
          const data = {
            projects: await prisma.project.findMany(),
            departments: await prisma.department.findMany(),
            issues: await prisma.issue.findMany(),
            documents: await prisma.document.findMany()
          };
          fs.writeFileSync('$targetBackupDir/prisma_export.json', JSON.stringify(data, null, 2));
          console.log('Snapshot logico gravado com sucesso.');
        }
        run();"
    }
}

# 2. Backup do Armazenamento de Anexos
$storageSource = "./data/storage"
$storageDest = Join-Path $targetBackupDir "storage"
if (Test-Path $storageSource) {
    Write-Host " Copiando arquivos anexos de $storageSource..."
    Copy-Item $storageSource -Destination $storageDest -Recurse -Force
    Write-Host " [OK] Armazenamento de anexos copiado com sucesso."
}

# 3. Geracao do Manifesto SHA-256 para Integridade
Write-Host " Gerando manifesto de hashes SHA-256..."
$manifest = @()
Get-ChildItem -Path $targetBackupDir -Recurse -File | ForEach-Object {
    if ($_.Name -ne "manifest.json") {
        $hash = (Get-FileHash -Path $_.FullName -Algorithm SHA256).Hash
        $relPath = Resolve-Path -Path $_.FullName -Relative
        $manifest += [PSCustomObject]@{
            FileName = $_.Name
            RelativePath = $relPath
            SizeBytes = $_.Length
            SHA256 = $hash
        }
    }
}

$manifest | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $targetBackupDir "manifest.json")

Write-Host "==============================================================================="
Write-Host "             BACKUP CONCLUÍDO COM SUCESSO!                                     "
Write-Host " Localização: $targetBackupDir"
Write-Host " Arquivos no manifesto: $($manifest.Count)"
Write-Host "==============================================================================="
