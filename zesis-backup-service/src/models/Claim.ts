import mongoose from "mongoose";

const Claim = new mongoose.Schema({
    _id: String,
    holderId: String,
    issuerId: String,
    claimId: String
});

export default mongoose.model("Claim", Claim);