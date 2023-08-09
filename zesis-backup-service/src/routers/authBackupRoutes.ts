import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";

export class AuthBackup {
    public router: Router;
    public authController = new AuthController();
    constructor () {
        this.router = Router();
        this.routers();
    }

    routers(): void {
        this.router.post("", this.authController.updateAuthData);
        this.router.get("/:holderId", this.authController.getAuthClaimByHolder);
    }
}