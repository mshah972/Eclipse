import "dotenv/config";
import mongoose from "mongoose";

export const connectDB = async () => {
    const uri = process.env.MONGODB_URL;
    const dbName = process.env.MONGODB_DB;

  try {
      const connection = await mongoose.connect(uri, { dbName });
      console.log(`🗄️ MongoDB connected -> host: ${connection.connection.host} db: ${connection.connection.name}`);
  } catch (e) {
      console.error("Mongo connection error: ", e.message);
      process.exit(1);
  }
};