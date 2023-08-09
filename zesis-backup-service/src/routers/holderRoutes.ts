import { Router } from "express";
import { HolderController } from "../controllers/HolderController.js";

export class HolderRoutes {
    public router: Router;
    public holderController = new HolderController();
    constructor () {
        this.router = Router();
        this.routers();
    }

    routers(): void {
        this.router.post("", this.holderController.createNewHolder);
        this.router.put("", this.holderController.uploadHolder);
        this.router.get("", this.holderController.getHolder);
    }
}