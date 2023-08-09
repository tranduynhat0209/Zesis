import mongoose from "mongoose";

const Backup = new mongoose.Schema({
    claimId: String,
    accessUri: String,
    storageId: String
});

export default mongoose.model("Backup", Backup);