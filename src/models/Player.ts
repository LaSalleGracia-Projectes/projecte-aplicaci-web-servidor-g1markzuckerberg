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
    detailedPositionId: {
        type: Number
    },
    commonName: {
        type: String
    },
    firstname: {
        type: String
    },
    lastname: {
        type: String
    },
    displayName: {
        type: String
    },
    imagePath: {
        type: String
    },
    jerseyNumber: {
        type: Number
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
