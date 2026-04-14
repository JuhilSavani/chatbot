/**
 * One-time database setup script.
 * Run this once before starting the server for the first time.
 *
 * What it does:
 * - Creates the LangGraph checkpointer persistence tables
 *   (`checkpoints` and `writes`) in your Supabase PostgreSQL database.
 *
 * These tables are required for the AI agent to persist conversation state
 * across requests. They are created using "CREATE TABLE IF NOT EXISTS",
 * so it is safe to re-run if needed.
 */

import { pgPool, checkpointer } from "../config/sequelize.config.js";

async function createPersistenceTables() {
  try {
    console.log("⏳ Setting up persistence tables...");
    // This creates the 'checkpoints' and 'writes' tables if they are missing.
    // It uses "CREATE TABLE IF NOT EXISTS", so it is safe to run on every restart.
    await checkpointer.setup();
    console.log("✅ Persistence tables are ready (checkpoints + writes).");
  } catch (error) {
    console.error("❌ Failed to set up persistence tables:", error.message);
    process.exit(1);
  } finally {
    await pgPool.end();
  }
}

createPersistenceTables();
