import { configureDatabase } from "./configure-db";
import { execSync } from "child_process";

console.log("=== BUILD RUNNER: CENTRAL DE IMPLANTAÇÕES ===");

// 1. Configura o schema.prisma conforme o DATABASE_URL ativo (PostgreSQL em produção/Vercel ou SQLite local)
try {
  configureDatabase();
} catch (e) {
  console.warn("Aviso na configuração do banco:", e);
}

// 2. Aplica as migrações / novas colunas (ex: departmentId) ao banco de dados de produção
try {
  console.log("\nExecutando prisma db push para atualizar schema e colunas...");
  execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
  console.log("✔ Banco de dados sincronizado com sucesso!");
} catch (pushError) {
  console.warn("Aviso ao executar prisma db push durante build:", pushError);
}
