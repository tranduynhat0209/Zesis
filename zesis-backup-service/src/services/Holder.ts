import Holder from "../models/Holder.js";

export async function createNewHolder(holderId: string, dek: string) {
    const holder = await Holder.findOne({holderId: holderId});
    if (holder) {
        throw("HolderId existed!");
    } else {
        const newHolder = new Holder({
            holderId: holderId,
            dek: dek,
            lastUpdate: Number(Date.now())
        });
        await newHolder.save();
        return {
            holderId: newHolder.holderId,
            dek: newHolder.dek,
            lastUpdate: newHolder.lastUpdate
        };
    }
}

export async function updateHolderDek(holderId: string, dek: string) {
    const holder = await Holder.findOne({holderId: holderId});
    if (!holder) {
        throw("HolderId not exist!");
    }
    holder.dek = dek;
    holder.lastUpdate = Number(Date.now());
    await holder.save();
    return {
        holderId: holder.holderId,
        dek: holder.dek,
        lastUpdate: holder.lastUpdate
    }
}

export async function getHolderDek(holderId: string) {
    const holder = await Holder.findOne({holderId: holderId});
    if (!holder) {
        throw("HolderId not exist!");
    }
    
    return {
        holderId: holder.holderId,
        dek: holder.dek,
        lastUpdate: holder.lastUpdate
    }
}