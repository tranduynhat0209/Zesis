import dotenv from 'dotenv';
import process from 'process';
dotenv.config();

export const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ISSUER_SERVER";
export const JWT_SECRET = process.env.JWT_SECRET ?? "random@123";
export const isProduction = process.env.NODE_ENV == "production";
export const LOG_LEVEL = process.env.LOG_LEVEL ?? "debug";
export const LOG_OUTPUT = process.env.LOG_OUTPUT ?? "dev";

export const DATA_ENCRYPT_DB_PATH = process.env.DATA_ENCRYPT_DB_PATH ?? "db/data_encrypt";
export const PRIVATE_KEY_ENCRYPT_DB_PATH = process.env.PRIVATE_KEY_ENCRYPT_DB_PATH ?? "db/private_key_encrypt";

export const EUENO_API_KEY = process.env.EUENO_API_KEY ?? "";
export const OWALLET_ADDRESS = process.env.OWALLET_ADDRESS ?? "";
export const WALLET_ADDRESS = process.env.WALLET_ADDRESS ?? "";
export const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";
export const BUCKET_ID = process.env.BUCKET_ID ?? "";

export const BACKUP_SERVER_URI = process.env.BACKUP_SERVER_URI ?? "http://localhost:5009";