import { Router } from "express";
import { DataBackupController } from "../controllers/DataBackupController.js";

export class DataBackupRoutes {
    public router: Router;
    public dataBackupController = new DataBackupController();
    constructor() {
        this.router = Router();
        this.routers();
    }

    routers(): void {
        this.router.get("/:id", this.dataBackupController.getDataById);
    }
}