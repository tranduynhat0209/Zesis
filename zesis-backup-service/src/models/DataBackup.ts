import mongoose from "mongoose";

const DataBackup = new mongoose.Schema({
    _id: String,
    holderId: String,
    issuerId: String,
    claimId: String,
    data: String,
    nonce: String
});

export default mongoose.model("DataBackup", DataBackup);