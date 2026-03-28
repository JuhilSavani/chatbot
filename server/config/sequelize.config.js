import { Pool } from 'pg';
import { Sequelize } from "sequelize";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const IS_PROD = process.env.NODE_ENV !== "development";
const SUPABASE_PG_URI = process.env.SUPABASE_PG_URI;

export const sequelize = new Sequelize(
  SUPABASE_PG_URI,
  {
    dialect: "postgres",
    /* SERVERLESS POOL STRATEGY: 
       We use a very small pool because each Vercel instance 
       only handles ONE request at a time.
    */
   pool: { 
      max: 1,       // One instance = One connection. Simple.
      min: 0,       // Don't keep connections open if the function is idle.
      idle: 0,      // Release the connection to Supavisor immediately after the request ends.
      acquire: 5000 // If we can't get a connection in 5s, fail (don't hang).
    },
    dialectOptions: {
      ssl: {
        require: true,             // force SSL usage
        rejectUnauthorized: false, // skip cert validation
      },
      prepareThreshold: 0, // CRITICAL for Supavisor Transaction Mode:
    },
    // logging: IS_PROD ? false : console.log, // show queries in dev
    logging: false
  }
);

export const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Postgres connected successfully!");

    if (!IS_PROD) {
      await sequelize.sync({ alter: true });
      console.log("🛠️ Database synced (dev mode).");
    }
  } catch (error) {
    console.error("❌ Unable to connect to Postgres:", error.message);
  }
};

export const pgPool = new Pool({
  connectionString: SUPABASE_PG_URI,
  max: 1, // Again, one is enough per Lambda instance
  ssl: { rejectUnauthorized: false },
  // Let Supavisor handle the "staying alive" part, not your code.
  idleTimeoutMillis: 1000, 
  connectionTimeoutMillis: 5000,
});

export const checkpointer = new PostgresSaver(pgPool);