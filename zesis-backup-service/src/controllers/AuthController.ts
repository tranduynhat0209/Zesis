import { Request, Response } from "express";
import { buildErrorMessage, buildResponse } from "../common/APIBuilderResponse.js";
import { ExceptionMessage } from "../common/enum/ExceptionMessages.js";
import { ResultMessage } from "../common/enum/ResultMessages.js";
import { getAuthClaim, uploadAuthData } from "../services/AuthClaim.js";

export class AuthController {
    public async updateAuthData(req: Request, res: Response) {
        try {
            const {holderId, data, nonce} = req.body;

            if (!holderId || !data || !nonce) {
                throw("Invalid data!");
            }

            let {type} = req.query;

            type = "ZIDEN";

            const backup = await uploadAuthData(holderId, data, nonce, type);
            res.send(buildResponse(ResultMessage.APISUCCESS.status, backup, ResultMessage.APISUCCESS.message));
        
        } catch (err: any) {
            res.send(buildErrorMessage(ExceptionMessage.UNKNOWN.status, err, ExceptionMessage.UNKNOWN.message));
        }
    }

    public async getAuthClaimByHolder(req: Request, res: Response) {
        try {
            let {holderId} = req.params;
            if (holderId == undefined)
                holderId = "";
            if (typeof holderId != "string") {
                throw("holderId must be string");
            }

            const backup = await getAuthClaim(holderId);
            res.send(buildResponse(ResultMessage.APISUCCESS.status, backup, ResultMessage.APISUCCESS.message));

        } catch (err: any) {
            res.send(buildErrorMessage(ExceptionMessage.UNKNOWN.status, err, ExceptionMessage.UNKNOWN.message));
        }
    }
}