import { Sequelize } from "sequelize";

const IS_PROD = process.env.NODE_ENV !== "development";

export const sequelize = new Sequelize(
  process.env.SUPABASE_PG_URI,
  {
    dialect: "postgres",
    logging: IS_PROD ? false : console.log, // show queries in dev
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      ssl: {
        require: true,             // force SSL usage
        rejectUnauthorized: false, // skip cert validation
      },
    }
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