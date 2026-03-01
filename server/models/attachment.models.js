import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.config.js";
import { Thread } from "./thread.models.js";

export const Attachment = sequelize.define(
  "Attachment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    threadId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    publicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tokenCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    messageIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "attachments",
    timestamps: true,
    indexes: [
      {
        fields: ["threadId"],
      },
    ],
  }
);

// Define Associations
Thread.hasMany(Attachment, { foreignKey: "threadId", as: "attachments", onDelete: "CASCADE" });
Attachment.belongsTo(Thread, { foreignKey: "threadId", as: "thread" });
