import "dotenv/config";
import mongoose from "mongoose";

export const connectDB = async () => {
  try {
      const connection = await mongoose.connect(process.env.MONGODB_URL);
      console.log(`🗄️ MongoDB connected: ${connection.connection.host}`);
  } catch (e) {
      console.error("Mongo connection error: ", e.message);
      process.exit(1);
  }
};