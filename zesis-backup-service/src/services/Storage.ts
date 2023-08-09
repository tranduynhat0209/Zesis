import Storage from "../models/Storage.js";
import {v4} from "uuid";

export async function addNewStorage(name: string, description: string, endpointUrl: string) {
    const newStorage = new Storage({
        storageId: v4(),
        name: name,
        description: description,
        endpointUrl: endpointUrl
    });

    await newStorage.save();
    return {
        storageId: newStorage.storageId,
        name: newStorage.name,
        description: newStorage.description,
        endpointUrl: newStorage.endpointUrl
    };
}

export async function getAllStorage() {
    const storages = await Storage.find();
    let res: Array<any> = [];
    storages.forEach((storage) => {
        res.push({
            storageId: storage.storageId,
            name: storage.name,
            description: storage.description,
            endpointUrl: storage.endpointUrl
        })
    });

    return res;
}

export async function getStorageById(storageId: String) {
    const storage = await Storage.findOne({storageId: storageId});

    if (!storage) {
        throw("StorageId not exist!");
    } else {
        return {
            storageId: storage.id,
            name: storage.name,
            description: storage.description,
            endpointUrl: storage.endpointUrl
        }
    }
}