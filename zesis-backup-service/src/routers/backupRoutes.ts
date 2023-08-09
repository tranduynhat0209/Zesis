import { Router } from "express";
import { BackupController } from "../controllers/BackupController.js";

export class Backup {
    public router: Router;
    public backupController = new BackupController();
    constructor () {
        this.router = Router();
        this.routers();
    }

    routers(): void {
        this.router.post("", this.backupController.updateData);
        this.router.get("", this.backupController.getAllClaimBy);
    }
}