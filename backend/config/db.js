
import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'HCM_Lite1';

  if (!uri) {
    throw new Error('MONGODB_URI is missing from backend/.env');
  }

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
  });

  console.log(`MongoDB Atlas connected: ${mongoose.connection.name}`);
};

export default connectDB;
