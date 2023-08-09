import { Request, Response } from "express";
import { buildErrorMessage, buildResponse } from "../common/APIBuilderResponse.js";
import { ExceptionMessage } from "../common/enum/ExceptionMessages.js";
import { ResultMessage } from "../common/enum/ResultMessages.js";
import { getClaim, uploadData } from "../services/Backup.js";
import { backupData } from "../services/DataBackup.js";

export class BackupController {
    public async updateData(req: Request, res: Response) {
        try {
            const {holderId, issuerId, claimId, data, nonce} = req.body;

            if (!holderId || !issuerId || !claimId|| !data || !nonce) {
                throw("Invalid data!");
            }

            let {type} = req.query;
            if (typeof type != 'string') {
                type = '';
            }

            const backup = await uploadData(holderId, issuerId, claimId, data, nonce, type);
            res.send(buildResponse(ResultMessage.APISUCCESS.status, backup, ResultMessage.APISUCCESS.message));
        
        } catch (err: any) {
            res.send(buildErrorMessage(ExceptionMessage.UNKNOWN.status, err, ExceptionMessage.UNKNOWN.message));
        }
    }

    public async getAllClaimBy(req: Request, res: Response) {
        try {
            let {holderId, issuerId, claimId} = req.query;
            if (holderId == undefined)
                holderId = "";
            if (typeof holderId != "string") {
                throw("holderId must be string");
            }

            if (issuerId == undefined)
                issuerId = "";
            if (typeof issuerId != "string") {
                throw("holderId must be string");
            }

            if (claimId == undefined)
                claimId = "";
            if (typeof claimId != "string") {
                throw("holderId must be string");
            }

            const backup = await getClaim(holderId, issuerId, claimId);
            res.send(buildResponse(ResultMessage.APISUCCESS.status, backup, ResultMessage.APISUCCESS.message));

        } catch (err: any) {
            res.send(buildErrorMessage(ExceptionMessage.UNKNOWN.status, err, ExceptionMessage.UNKNOWN.message));
        }
    }
}