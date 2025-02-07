import mongoose from 'mongoose';

// Crear esquema del usuario
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  }
});

// Crear modelo del usuario y exportarlo
export default mongoose.model('User', userSchema);