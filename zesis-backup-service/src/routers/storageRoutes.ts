import { Router } from "express";
import { StorageController } from "../controllers/StorageController.js";

export class StorageRoutes {
    public router: Router;
    public storageController = new StorageController();
    constructor() {
        this.router = Router();
        this.routers();
    }

    routers(): void {
        this.router.post("", this.storageController.createNewStorage);
        this.router.get("", this.storageController.getAllStorage);
        this.router.get("/:id", this.storageController.getStorageById);
    }
}