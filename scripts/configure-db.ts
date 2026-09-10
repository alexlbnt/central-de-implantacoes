import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export function configureDatabase() {
  const envPath = path.resolve(".env");
  const args = process.argv.slice(2);
  let mode = args.includes("--local") ? "local" : args.includes("--postgres") ? "postgres" : null;

  let dbUrl = process.env.DATABASE_URL;

  if (mode === "local") {
    dbUrl = "file:./data/central.db";
  } else if (mode === "postgres") {
    dbUrl = "postgresql://postgres:postgres@localhost:5432/central_implantacoes?schema=public";
  } else if (!dbUrl) {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)["']?/);
      if (match) {
        dbUrl = match[1];
      }
    }
  }

  if (!dbUrl) {
    dbUrl = "postgresql://postgres:postgres@localhost:5432/central_implantacoes?schema=public";
  }

  if (mode && fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf-8");
    envContent = envContent.replace(/DATABASE_URL=["']?[^"'\r\n]+["']?/, `DATABASE_URL="${dbUrl}"`);
    fs.writeFileSync(envPath, envContent);
  }

  const isPostgres = dbUrl.startsWith("postgresql://") || dbUrl.startsWith("postgres://");
  const targetProvider = isPostgres ? "postgresql" : "sqlite";

  const schemaPath = path.resolve("prisma/schema.prisma");
  let schema = fs.readFileSync(schemaPath, "utf-8");

  const currentProviderMatch = schema.match(/provider\s*=\s*"(postgresql|sqlite)"/);
  const currentProvider = currentProviderMatch ? currentProviderMatch[1] : null;

  if (currentProvider !== targetProvider) {
    console.log(`Atualizando prisma/schema.prisma para o provedor: ${targetProvider}...`);
    schema = schema.replace(/provider\s*=\s*"(postgresql|sqlite)"/, `provider = "${targetProvider}"`);
    fs.writeFileSync(schemaPath, schema);
    console.log(`Regerando Prisma Client para ${targetProvider}...`);
    execSync("npx prisma generate", { stdio: "inherit" });
  }

  const storageDriver = process.env.STORAGE_DRIVER || "local";
  const storageLocation = storageDriver === "s3" ? process.env.S3_ENDPOINT || "http://localhost:9000" : path.resolve("./data/storage");

  console.log("===============================================================================");
  console.log("             CENTRAL DE IMPLANTAÇÕES - AMBIENTE ATIVO                          ");
  console.log("-------------------------------------------------------------------------------");
  console.log(` Motor de Banco:          ${isPostgres ? "PostgreSQL (Docker Compose / Servidor)" : "SQLite Local Standalone"}`);
  console.log(` String de Conexão:       ${dbUrl}`);
  console.log(` Persistência dos Dados:  ${isPostgres ? "Volume PostgreSQL Docker (pgdata)" : path.resolve("./data/central.db")}`);
  console.log(` Armazenamento Arquivos:  ${storageDriver.toUpperCase()} (${storageLocation})`);
  console.log("===============================================================================");

  return { isPostgres, targetProvider, dbUrl };
}

if (require.main === module) {
  configureDatabase();
}
