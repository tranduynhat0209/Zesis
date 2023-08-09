// import logger from 'morgan';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import mongoose from 'mongoose';

import {MONGODB_URI, LOG_OUTPUT} from "./common/config/secrets.js";
import dotenv from 'dotenv';
import * as swaggerUi from "swagger-ui-express";
import { readFileSync } from 'fs';
import logger from './lib/logger/index.js';
import morgan from 'morgan';
import { Backup } from './routers/backupRoutes.js';
import { HolderRoutes } from './routers/holderRoutes.js';
import { StorageRoutes } from './routers/storageRoutes.js';
import { DataBackupRoutes } from './routers/dataBackup.js';
import { AuthDataBackupRoutes } from './routers/authDataBackup.js';
import { AuthBackup } from './routers/authBackupRoutes.js';

const swaggerDocument = JSON.parse(readFileSync("swagger/swagger.json", "utf-8"));

dotenv.config();

class Server {
    public app: express.Application;
    constructor () {
        this.app = express();
        this.config();
        this.routes();
        this.mongo();
        this.configSwagger();
        // setupGlobalVariables();

    }

    public routes(): void {
        this.app.use("/api/v1/backup", new Backup().router);
        this.app.use("/api/v1/holder", new HolderRoutes().router);  
        this.app.use("/api/v1/data", new DataBackupRoutes().router);
        this.app.use("/api/v1/storage", new StorageRoutes().router); 
         
        this.app.use("/api/v1/auth-backup", new AuthBackup().router);
        this.app.use("/api/v1/auth-claim", new AuthDataBackupRoutes().router);
    }

    public config(): void {
        this.app.set("port", process.env.PORT || 5005);
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(compression());
        this.app.use(cors());

        const myStream = {
          write: (text: any) => {
            logger.info(text);
          }
        }
        this.app.use(morgan(LOG_OUTPUT, {stream: myStream}));
        // this.app.use(logger('[:date[web]] | :method :url | :status | :response-time ms'));
        
      }

    private mongo(): void {
        const connection = mongoose.connection;
        connection.on("connected", () => {
          logger.info("Mongo Connection Established");
        });
        connection.on("reconnected", () => {
          logger.info("Mongo Connection Reestablished");
        });
        connection.on("disconnected", () => {
          logger.info("Mongo Connection Disconnected");
          logger.info("Trying to reconnect to Mongo ...");
          setTimeout(() => {
            mongoose.connect(MONGODB_URI, {
                keepAlive: true
            });
          }, 3000);
        });
        connection.on("close", () => {
          logger.info("Mongo Connection Closed");
        });
        connection.on("error", (error: Error) => {
          logger.info("Mongo Connection ERROR: " + error);
        });
    
        const run = async () => {
          await mongoose.connect(MONGODB_URI, {
            keepAlive: true
          });
        };
        run().catch(error => console.error(error));
    }

    private configSwagger(): void {
      this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    }
    
    public start(): void {
        this.app.listen(this.app.get("port"), () => {
          logger.info(
            "API is running at http://localhost:" + 
            this.app.get("port")
            );
        });
    }

}

async function startServer(): Promise<void> {
  const server = new Server();
  server.start();
}

startServer();