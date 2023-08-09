import { Router } from "express";
import { AuthDataBackupController } from "../controllers/AuthDataBackupController.js";

export class AuthDataBackupRoutes {
    public router: Router;
    public authDataBackupController = new AuthDataBackupController();
    constructor() {
        this.router = Router();
        this.routers();
    }

    routers(): void {
        this.router.get("/:id", this.authDataBackupController.getDataById);
    }
}