import mongoose from "mongoose";

const Holder = new mongoose.Schema({
    holderId: String,
    dek: String,
    lastUpdate: Number
});

export default mongoose.model("Holder", Holder);