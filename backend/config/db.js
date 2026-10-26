import mongoose from 'mongoose';

let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'HCM_Lite1';

  if (!uri) {
    throw new Error('MONGODB_URI is missing from backend/.env');
  }

  await mongoose.connect(uri, {
    dbName,
    serverSelectionTimeoutMS: 15000,
  });

  isConnected = true;
  console.log(`MongoDB Atlas connected: ${mongoose.connection.name}`);
  return mongoose.connection;
};

export default connectDB;
