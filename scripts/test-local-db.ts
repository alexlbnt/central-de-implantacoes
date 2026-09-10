import EmbeddedPostgres from "embedded-postgres";
import path from "path";
import fs from "fs";

async function main() {
  console.log("Starting embedded postgres test...");
  const dataDir = path.resolve("./data/postgres");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    port: 5433,
    user: "postgres",
    password: "postgres",
    persistent: true,
  });

  try {
    console.log("Initialising embedded postgres...");
    await pg.initialise();
    console.log("Postgres initialised successfully!");
    console.log("Starting embedded postgres...");
    await pg.start();
    console.log("Postgres started successfully on port 5433!");
    await pg.stop();
    console.log("Postgres stopped successfully.");
  } catch (err) {
    console.error("Error running embedded postgres:", err);
    process.exit(1);
  }
}

main();
