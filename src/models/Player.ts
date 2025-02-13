import mongoose from "mongoose";

// Crear esquema del jugador
const playerSchema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true
    },
    teamId: {
        type: Number,
        required: true
    },
    positionId: {
        type: Number,
        required: true
    },
    displayName: {
        type: String
    },
    imagePath: {
        type: String
    },
    points: [
        {
            matchday: {
                type: Number,
                required: true
            },
            score: {
                type: Number,
                default: 0
            }
        }
    ]
});

// Crear modelo del jugador y exportarlo
export default mongoose.model("Player", playerSchema);
