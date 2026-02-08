import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.config.js";
import { User } from "./user.models.js";

export const Thread = sequelize.define(
  "Thread",
  {
    threadId: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Untitled Chat",
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "threads",
    timestamps: true, // creates createdAt, updatedAt
    indexes: [
      {
        fields: ["userId"],
      },
    ],
  }
);

// Define Associations
User.hasMany(Thread, { foreignKey: "userId", as: "threads" });
Thread.belongsTo(User, { foreignKey: "userId", as: "user" });

