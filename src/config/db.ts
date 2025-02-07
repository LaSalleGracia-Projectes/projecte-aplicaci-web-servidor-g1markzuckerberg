import mongoose, { type ConnectOptions } from 'mongoose';

const createConnection = async () => {
  try {

    const options: ConnectOptions = { };

    const dbUrl = process.env.DB_URL ?? '';

    await mongoose.connect(dbUrl, options);
    console.log('INFO Connected to the DB');

    mongoose.connection.on('error', (error) => {
      console.log('ERROR The connection was interrupted: ', error);
    })
  } catch (error) {
    console.log('ERROR Cannot connect to the DB: ', error);
  }
}

export default createConnection;
