import { spawn } from "child_process";
import { configureDatabase } from "./configure-db";

configureDatabase();

console.log("\n?? Iniciando servidor de desenvolvimento Next.js na porta 3000...\n");

const nextProcess = spawn("npx", ["next", "dev", "-p", "3000"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

nextProcess.on("error", (err) => {
  console.error("Erro ao iniciar o servidor Next.js:", err);
  process.exit(1);
});

nextProcess.on("close", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  nextProcess.kill("SIGINT");
});

process.on("SIGTERM", () => {
  nextProcess.kill("SIGTERM");
});
