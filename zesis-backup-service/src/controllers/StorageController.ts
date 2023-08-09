import { Request, Response } from "express";
import { buildErrorMessage, buildResponse } from "../common/APIBuilderResponse.js";
import { ExceptionMessage } from "../common/enum/ExceptionMessages.js";
import { ResultMessage } from "../common/enum/ResultMessages.js";
import { addNewStorage, getAllStorage, getStorageById } from "../services/Storage.js";

export class StorageController {
    public async createNewStorage(req: Request, res: Response) {
        try {
            const {name, description, endpointUrl} = req.body;
            if (!name || !description || !endpointUrl
                || typeof name != "string" || typeof description != "string" || typeof endpointUrl != "string") {
                    throw ("Invalid data");
            }
            const storage = await addNewStorage(name, description, endpointUrl);
            res.send(buildResponse(ResultMessage.APISUCCESS.status, storage, ResultMessage.APISUCCESS.message));
        } catch (err: any) {
            res.send(buildErrorMessage(ExceptionMessage.UNKNOWN.status, err, ExceptionMessage.UNKNOWN.message));
        }
    }

    public async getAllStorage(req: Request, res: Response) {
        try {
            const storage = await getAllStorage();
            res.send(buildResponse(ResultMessage.APISUCCESS.status, storage, ResultMessage.APISUCCESS.message));
        } catch (err: any) {
            res.send(buildErrorMessage(ExceptionMessage.UNKNOWN.status, err, ExceptionMessage.UNKNOWN.message));
        }
    }

    public async getStorageById(req: Request, res: Response) {
        try {
            const {id} = req.params;
            if (!id || typeof id != "string") {
                throw("Invalid storageId")
            };
            const storage = await getStorageById(id);
            res.send(buildResponse(ResultMessage.APISUCCESS.status, storage, ResultMessage.APISUCCESS.message));
        } catch (err: any) {
            res.send(buildErrorMessage(ExceptionMessage.UNKNOWN.status, err, ExceptionMessage.UNKNOWN.message));
        }
    }
}