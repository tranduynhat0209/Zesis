import mongoose from "mongoose";

const Storage = new mongoose.Schema({
    storageId: String,
    name: String,
    description: String,
    endpointUrl: String
});

export default mongoose.model("Storage", Storage);