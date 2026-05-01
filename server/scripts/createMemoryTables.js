import { pgPool, memoryStore } from "../config/sequelize.config.js";

async function createMemoryTables() {
  console.log("Setting up memory store tables...");
  try {
    await memoryStore.setup();
    console.log("✅ Memory store tables created successfully!");
  } catch (error) {
    console.error("❌ Failed to create memory store tables:", error);
  } finally {
    // PostgresStore creates its own pool internally, so we force exit.
    process.exit(0);
  }
}

createMemoryTables();

