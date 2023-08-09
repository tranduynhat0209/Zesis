import mongoose from "mongoose";

const Auth = new mongoose.Schema({
    holderId: String,
    accessUri: String,
    storageId: String
});

export default mongoose.model("Auth", Auth);