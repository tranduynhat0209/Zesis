import { BACKUP_SERVER_URI } from "../common/config/secrets.js";
import AuthClaim from "../models/AuthClaim.js";

export async function backupAuthClaimData(holderId: string, data: string, nonce: string) {
    try {
        const id = holderId;

        const dataBackup = await AuthClaim.findOne({
            _id: id
        });
        if (dataBackup) {
            dataBackup.data = data;
            dataBackup.nonce = nonce;
            await dataBackup.save();
            return BACKUP_SERVER_URI + "/api/v1/auth-claim/" + dataBackup.id;
        } else {
            const newData = new AuthClaim({
                _id: id,
                holderId: holderId,
                data: data,
                nonce: nonce
            });
            await newData.save();
            return BACKUP_SERVER_URI + "/api/v1/auth-claim/" + newData.id;
        }
    } catch (err: any) {
        throw (err);
    }
}

export async function getAuthClaimDataById(id: String) {
    const data = await AuthClaim.findOne({_id: id});
    if (!data) {
        throw("Id is not existed!");
    } else {
        return {
            holderId: data.holderId,
            data: data.data,
            nonce: data.nonce
        }
    }
}