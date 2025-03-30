import mongoose, { type ConnectOptions } from 'mongoose';
import postgres from 'postgres';

const createMongoConnection = async () => {
  try {
    const options: ConnectOptions = {};
    const dbUrl = process.env.DB_URL ?? '';

    await mongoose.connect(dbUrl, options);
    console.log('✅ Connected to MongoDB');

    mongoose.connection.on('error', (error) => {
      console.log('❌ ERROR MongoDB connection interrupted:', error);
    });
  } catch (error) {
    console.log('❌ ERROR Cannot connect to MongoDB:', error);
  }
};

const createPostgresConnection = async () => {
  try {
    const connectionString = process.env.DATABASE_URL2 ?? '';
    const sql = postgres(connectionString);
    console.log('✅ Connected to PostgreSQL (Supabase)');
    return sql;
  } catch (error) {
    console.log('❌ ERROR Cannot connect to PostgreSQL:', error);
    throw new Error('❌ ERROR Cannot connect to PostgreSQL: ' + String(error.message));
  }
};

export { createMongoConnection, createPostgresConnection };
