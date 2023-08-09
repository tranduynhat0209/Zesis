import { v4 } from "uuid";
import Backup from "../models/Backup.js";
import Claim from "../models/Claim.js";
import Storage from "../models/Storage.js";
import { backupData } from "./DataBackup.js";

export async function uploadData(holderId: string, issuerId: string, claimId: string, data: string, nonce: string, type: string) {
    let accessUri = "";
    let storageId = "";

    const storage = await Storage.findOne({name: type});
    if (storage) {
        storageId = storage.id;
    }

    accessUri = await backupData(holderId, issuerId, claimId, data, nonce);

    const lastBackup = await Backup.findOne({claimId: claimId, storageId: storageId});
    if (!lastBackup) {
        const newBackup = new Backup({
            claimId: claimId,
            accessUri: accessUri,
            storageId: storageId
        });
        await newBackup.save();    
    } else {
        lastBackup.accessUri = accessUri;
        await lastBackup.save();
    }

    const claim = await Claim.findOne({holderId: holderId, issuerId: issuerId, claimId: claimId});
    if (!claim) {
        const newClaim = new Claim({
            _id: v4(),
            holderId: holderId,
            issuerId: issuerId,
            claimId: claimId
        });

        await newClaim.save();
    }

    return {
        claimId: claimId,
        accessUri: accessUri,
        storageId: storageId
    }
}

export async function getClaim(holderId: string, issuerId: string, claimId: string) {
    const query: any = {};
    if (holderId != "") {
        query["holderId"] = holderId;
    }
    if (issuerId != "") {
        query["issuerId"] = issuerId;
    }
    if (claimId != "") {
        query["claimId"] = claimId;
    }

    const claims = await Claim.find(query);
    const claimIds: Array<string> = [];
    claims.forEach((claim) => {
        claimIds.push(claim.claimId!);
    });

    const dataBackup = await Backup.find({claimId: {$in: claimIds}});
    const res: Array<any> = [];
    dataBackup.forEach((data) => {
        res.push({
            claimId: data.claimId,
            accessUri: data.accessUri,
            storageId: data.storageId
        });
    });

    console.log(res);

    return res;
}