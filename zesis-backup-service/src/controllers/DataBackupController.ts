import { Request, Response} from "express";
import { buildErrorMessage } from "../common/APIBuilderResponse.js";
import { ExceptionMessage } from "../common/enum/ExceptionMessages.js";
import { getDataById } from "../services/DataBackup.js";

export class DataBackupController {
    public async getDataById(req: Request, res: Response) {
        try {
            const id = req.params["id"];
            if (!id || typeof id != "string") {
                throw("Invalid id");
            } else {
                const data = await getDataById(id);
                res.send(data);
                return;
            }
        } catch (err: any) {
            res.send(buildErrorMessage(ExceptionMessage.UNKNOWN.status, err, ExceptionMessage.UNKNOWN.message));
        }
    }
}