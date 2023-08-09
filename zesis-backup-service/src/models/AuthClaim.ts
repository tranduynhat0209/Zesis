import mongoose from "mongoose";

const AuthClaim = new mongoose.Schema({
    _id: String,
    holderId: String,
    data: String,
    nonce: String
});

export default mongoose.model("AuthClaim", AuthClaim);