import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.config.js";

export const User = sequelize.define(
  "User",
  {
    id: { 
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        len: [3, 30],
      },
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    roles: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: ["user"], 
      allowNull: false,
    },
    oauthProviders: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    }
  },
  {
    tableName: "users",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: [sequelize.fn("LOWER", sequelize.col("username"))],
        name: "users_username_lower_unique",
      },
    ],
  }
);