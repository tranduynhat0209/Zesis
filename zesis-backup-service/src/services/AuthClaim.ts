import Auth from "../models/Auth.js";
import Storage from "../models/Storage.js";
import { backupAuthClaimData } from "./AuthClaimBackup.js";

export async function uploadAuthData(holderId: string, data: string, nonce: string, type: string) {
    let accessUri = "";
    let storageId = "";

    const storage = await Storage.findOne({name: type});
    if (storage) {
        storageId = storage.id;
    }

    if (type == "ZIDEN") {
        accessUri = await backupAuthClaimData(holderId, data, nonce);
    }

    const lastBackup = await Auth.findOne({holderId: holderId, storageId: storageId});
    if (!lastBackup) {
        const newBackup = new Auth({
            holderId: holderId,
            accessUri: accessUri,
            storageId: storageId
        });
        await newBackup.save();    
    } else {
        lastBackup.accessUri = accessUri;
        await lastBackup.save();
    }

    return {
        holderId: holderId,
        accessUri: accessUri,
        storageId: storageId
    }
}

export async function getAuthClaim(holderId: string) {
    const auths = await Auth.findOne({holderId: holderId});
    if (!auths) {
        throw("holderId not existed!")
    } else {
        return {
            holderId: holderId,
            accessUri: auths.accessUri,
            storageId: auths.storageId
        }
    }
}