import LocalStorageDB from "../db/localStorageDb";
import * as bip39 from "bip39";
import { generate_randombytes_buf, sodium } from "./cryptographyUtils";
import {
  encrypt_and_prepend_nonce,
  decrypt_after_extracting_nonce,
} from "./cryptographyUtils";

//zidenjs
import {
  db as zidenjsDb,
  utils as zidenjsUtils,
  auth,
  state,
  Auth,
  smt,
  stateTransition,
} from "@zidendev/zidenjs";
import {
  AUTH_LVLDB_PATH,
  CLAIM_LVLDB_PATH,
  CLAIM_REV_LVLDB_PATH,
  WALLET_LOCKED_MESSAGE,
  ZIDEN_LEVEL_DB_PATH,
  AUTH_REV_NONCE_DB_PATH,
  CLAIM_REV_NONCE_DB_PATH,
  NO_PRIVATEKEY_MESSAGE,
  NO_KEY_LEFT,
  NO_KEY_MATCH,
  NO_ACTIVE_AUTH,
  ZIDEN_LEVEL_DB_CLONE_PATH,
  AUTH_REV_NONCE_CLONE_PATH,
} from "./config";

//generate key
const hdkey = require("hdkey");
const pbkdf2 = require("pbkdf2");
//level DB

export default class KeyContainer {
  name: string;
  encryptionKey: Uint8Array;
  db: any;
  timer: any;
  constructor(db: any) {
    this.name = "ziden";
    this.encryptionKey = new Uint8Array();
    if (db) {
      this.db = db;
    } else {
      this.db = new LocalStorageDB(this.name);
    }
    this.timer = {};
  }

  unlock(password: string) {
    const passwordHash = pbkdf2.pbkdf2Sync(password, "salt", 256, 32, "sha512"); // password hash in buffer
    this.encryptionKey = passwordHash;
    clearTimeout(this.timer);
    const self = this;
    this.timer = setTimeout(() => {
      console.log("key expired");
      self.encryptionKey = new Uint8Array();
    }, 28800000);
  }
  getEncryptionKey(password: string) {
    const passwordHash = pbkdf2.pbkdf2Sync(password, "salt", 256, 32, "sha512"); // password hash in buffer
    return passwordHash;
  }
  isUnlock() {
    if (this.encryptionKey.length !== 0) {
      return true;
    }
    return false;
  }
  lock() {
    if (!this.encryptionKey) {
      return;
    }
    clearTimeout(this.timer);
    // key container locked
    this.encryptionKey = new Uint8Array();
  }
  encrypt(message: string) {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    return encrypt_and_prepend_nonce(this.encryptionKey, message);
  }
  encryptWithDataKey(message: string) {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    let dataKey = this.db.get("ziden-data-key");
    if (!dataKey) {
      this.generateDataKey();
    }
    dataKey = this.db.get("ziden-data-key");
    const dataKeyDecrypted = this.decrypt(dataKey);
    return encrypt_and_prepend_nonce(
      Buffer.from(dataKeyDecrypted, "hex"),
      message
    );
  }
  encryptAndStore(message: string, key: string) {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    try {
      this.db.insert(key, this.encrypt(message));
      return true;
    } catch (err) {
      return false;
    }
  }
  encryptAndStoreWithDataKey(message: string, key: string) {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    try {
      this.db.insert(key, this.encryptWithDataKey(message));
      return true;
    } catch (err) {
      console.log(err);
      return false;
    }
  }
  decryptFromDB(key: string) {
    if (!this.isUnlock()) {
      return "";
    }
    const encrypted = this.db.get(key);
    if (!encrypted) {
      console.log("field empty");
      return "";
    }
    try {
      return this.decrypt(encrypted);
    } catch (err) {
      console.log(err);
      return "";
    }
  }
  decrypt(EncryptedMessage: string) {
    if (!this.isUnlock()) {
      return "";
    }
    //return decrypt(this.encryptionKey, EncryptedMessage);
    return decrypt_after_extracting_nonce(this.encryptionKey, EncryptedMessage);
  }
  decryptWithDataKey(EncryptedMessage: string) {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    let dataKey = this.db.get("ziden-data-key");
    if (!dataKey) {
      this.generateDataKey();
      dataKey = this.db.get("ziden-data-key");
    }
    const dataKeyDecrypted = this.decrypt(dataKey);
    return decrypt_after_extracting_nonce(
      Buffer.from(dataKeyDecrypted, "hex"),
      EncryptedMessage
    );
  }
  decryptWithKey(key: Uint8Array, message: string) {
    //return decrypt(key, message);
    return decrypt_after_extracting_nonce(key, message);
  }
  generateMasterSeed() {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const mnemonic = bip39.generateMnemonic();
    return mnemonic;
  }
  setMasterSeed(InputMnemonic: string) {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    let mnemonic;
    if (InputMnemonic) {
      if (bip39.validateMnemonic(InputMnemonic)) {
        mnemonic = InputMnemonic;
        this.db.insert("ziden-user-masterseed", this.encrypt(mnemonic));
      } else {
        throw Error("Invalid mnemonic");
      }
    } else {
      mnemonic = bip39.generateMnemonic();
      this.db.insert("ziden-user-masterseed", this.encrypt(mnemonic));
    }
  }
  getMasterSeedDecrypted() {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const masterSeedEncrypted = this.db.get("ziden-user-masterseed");
    if (masterSeedEncrypted === undefined) {
      throw Error("Mnemonic desn't exist");
    } else {
      return this.decrypt(masterSeedEncrypted);
    }
  }
  getMasterSeed() {
    const masterSeedEncrypted = this.db.get("ziden-user-masterseed");
    if (masterSeedEncrypted === undefined) {
      throw Error("Master seed not exist!");
    } else {
      return masterSeedEncrypted;
    }
  }

  generateDataKey() {
    const encryptionData = generate_randombytes_buf(32);
    const encryptionDataHex = Buffer.from(encryptionData).toString("hex");
    this.encryptAndStore(encryptionDataHex, "ziden-data-key");
  }

  /**
   * generate key pair for encrypt - decrypt claim from server
   * @returns
   */
  generateKeyForClaim = () => {
    if (sodium) {
      const { publicKey, privateKey } = sodium.crypto_box_keypair();
      return {
        publicKey,
        privateKey,
      };
    } else {
      return null;
    }
  };
  /**
   * generate hex key pair for encrypt - decrypt claim from server
   * @return {
        publicKey,
        privateKey,
      }
   */
  generateHexKeyForClaim = () => {
    if (sodium) {
      const {
        publicKey,
        privateKey,
      }: { publicKey: string; privateKey: string } =
        sodium.crypto_box_keypair("hex");
      return {
        publicKey,
        privateKey,
      };
    } else {
      return null;
    }
  };
  getCryptoUtil = () => {
    if (sodium) {
      return sodium;
    } else {
      return null;
    }
  };
  /**
   * get user id from local storage
   * @returns
   */
  getUserID = () => {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    return this.db.get("userID");
  };
  /**
   * get all auth claims from private keys stored in local storage
   * @return auth claims
   */
  getAuthClaims: () => Auth[] = () => {
    if (this.isUnlock()) {
      const privateKeysHex = this.getKeysDecrypted();
      if (privateKeysHex?.length) {
        return privateKeysHex.map((privateKeyHex: any) => {
          const privateKeyBuff = zidenjsUtils.hexToBuffer(
            privateKeyHex.privateKey,
            32
          );
          let authClaim = auth.newAuthFromPrivateKey(privateKeyBuff);
          authClaim.authHi = BigInt(privateKeyHex.index);
          return authClaim;
        });
      } else {
        throw Error(NO_PRIVATEKEY_MESSAGE);
      }
    } else {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
  };
  /**
   * get an auth claim from a private key stored in local storage, given the index
   * @return auth claim
   */
  getAuthClaim: (index: number) => Auth = (index) => {
    if (this.isUnlock()) {
      const privateKeyHex = this.getKeyDecrypted(index);
      if (privateKeyHex) {
        const privateKeyBuff = zidenjsUtils.hexToBuffer(privateKeyHex, 32);
        let authClaim = auth.newAuthFromPrivateKey(privateKeyBuff);
        authClaim.authHi = BigInt(index);
        return authClaim;
      } else {
        throw Error(NO_PRIVATEKEY_MESSAGE);
      }
    } else {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
  };

  /**
   * construct the user tree from auth claims
   * @return user tree
   */
  generateUserTree = async () => {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const authDb = new zidenjsDb.SMTLevelDb(
      `${ZIDEN_LEVEL_DB_PATH}/${AUTH_LVLDB_PATH}`
    );
    const claimsDb = new zidenjsDb.SMTLevelDb(
      `${ZIDEN_LEVEL_DB_PATH}/${CLAIM_LVLDB_PATH}`
    );
    const claimsRevDb = new zidenjsDb.SMTLevelDb(
      `${ZIDEN_LEVEL_DB_PATH}/${CLAIM_REV_LVLDB_PATH}`
    );
    const authClaims = this.getAuthClaims();
    const userTree = await state.State.generateState(
      authClaims,
      authDb,
      claimsDb,
      claimsRevDb
    );
    console.log(zidenjsUtils.bitsToNum(userTree.getIdenState()));
    this.db.insert(CLAIM_REV_NONCE_DB_PATH, userTree.claimRevNonce);
    this.db.insert(AUTH_REV_NONCE_DB_PATH, userTree.authRevNonce);
    this.db.insert("userID", zidenjsUtils.bufferToHex(userTree.userID));
    this.replicateLevelDbs();
    return userTree;
  };

  /**
   * recover current user tree
   * @return user tree
   */
  getUserTree = async () => {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const authDb = new zidenjsDb.SMTLevelDb(
      `${ZIDEN_LEVEL_DB_PATH}/${AUTH_LVLDB_PATH}`
    );
    const claimsDb = new zidenjsDb.SMTLevelDb(
      `${ZIDEN_LEVEL_DB_PATH}/${CLAIM_LVLDB_PATH}`
    );
    const claimsRevDb = new zidenjsDb.SMTLevelDb(
      `${ZIDEN_LEVEL_DB_PATH}/${CLAIM_REV_LVLDB_PATH}`
    );
    const userTree = new state.State(
      new smt.QuinSMT(authDb, await authDb.getRoot(), 8),
      new smt.QuinSMT(claimsDb, await claimsDb.getRoot(), 14),
      new smt.QuinSMT(claimsRevDb, await claimsRevDb.getRoot(), 14),
      this.db.get(AUTH_REV_NONCE_DB_PATH) ?? 0,
      this.db.get(CLAIM_REV_NONCE_DB_PATH) ?? 0,
      8,
      14,
      zidenjsUtils.hexToBuffer(this.db.get("userID"), 32)
    );
    return userTree;
  };

  /**
   * replicate current leveldbs
   */
  replicateLevelDbs() {
    const path = `level-js-${ZIDEN_LEVEL_DB_PATH}/${AUTH_LVLDB_PATH}`;
    const clonePath = `level-js-${ZIDEN_LEVEL_DB_CLONE_PATH}/${AUTH_LVLDB_PATH}`;
    const objectPath = `${ZIDEN_LEVEL_DB_PATH}/${AUTH_LVLDB_PATH}`;
    const cloneObjectPath = `${ZIDEN_LEVEL_DB_CLONE_PATH}/${AUTH_LVLDB_PATH}`;

    const request = indexedDB.open(path);

    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction(objectPath, "readonly");
      const data = read.objectStore(objectPath);
      const allKeys = data.getAllKeys();
      const allValues = data.getAll();

      allKeys.onsuccess = () => {
        allValues.onsuccess = () => {
          const request_clone = indexedDB.open(clonePath);

          request_clone.onsuccess = () => {
            const dbClone = request_clone.result;
            const write = dbClone.transaction(cloneObjectPath, "readwrite");
            const store = write.objectStore(cloneObjectPath);

            const clear = store.clear();
            clear.onsuccess = () => {
              for (let i = 0; i < allKeys.result.length; i++) {
                const add = store.add(allValues.result[i], allKeys.result[i]);
                add.onerror = function () {
                  console.log(add.error); // TransactionInactiveError
                };
              }
            };
          };
        };
      };
    };
  }

  /**
   * recover current leveldbs to the previous stage
   */
  recoverLevelDbs() {
    const path = `level-js-${ZIDEN_LEVEL_DB_PATH}/${AUTH_LVLDB_PATH}`;
    const clonePath = `level-js-${ZIDEN_LEVEL_DB_CLONE_PATH}/${AUTH_LVLDB_PATH}`;
    const objectPath = `${ZIDEN_LEVEL_DB_PATH}/${AUTH_LVLDB_PATH}`;
    const cloneObjectPath = `${ZIDEN_LEVEL_DB_CLONE_PATH}/${AUTH_LVLDB_PATH}`;

    const request_clone = indexedDB.open(clonePath);

    request_clone.onsuccess = () => {
      const dbClone = request_clone.result;
      const read = dbClone.transaction(cloneObjectPath, "readonly");
      const data = read.objectStore(cloneObjectPath);
      const allKeys = data.getAllKeys();
      const allValues = data.getAll();

      allKeys.onsuccess = () => {
        allValues.onsuccess = () => {
          const request = indexedDB.open(path);

          request.onsuccess = () => {
            const db = request.result;
            const write = db.transaction(objectPath, "readwrite");
            const store = write.objectStore(objectPath);

            const clear = store.clear();
            clear.onsuccess = () => {
              for (let i = 0; i < allKeys.result.length; i++) {
                const add = store.add(allValues.result[i], allKeys.result[i]);
                add.onerror = function () {
                  console.log(add.error); // TransactionInactiveError
                };
              }
            };
          };
        };
      };
    };
  }

  /**
   * get an encrypted private key from local storage given the index
   * @returns
   */
  getKey(index: number) {
    return this.db.get(`ziden-privateKeyEncrypted/${index}`);
  }
  /**
   * get all encrypted private keys from local storage
   * @returns
   */
  getKeys() {
    return this.db.getList("ziden-privateKeyEncrypted");
  }

  /**
   * get all private keys
   * @returns
   */
  getKeysDecrypted() {
    const keys = this.getKeys();
    return keys.map((key: any) => {
      return {
        index: parseInt(key[0].substring(key[0].lastIndexOf("/") + 1)),
        privateKey: this.decrypt(key[1]),
      };
    });
  }

  /**
   * store all private keys
   * @returns
   */
  storeKeysDecrypted(decryptedKeys: [{ index: number; privateKey: string }]) {
    decryptedKeys.map((key) => {
      this.db.insert(
        `ziden-privateKeyEncrypted/${key.index}`,
        this.encrypt(key.privateKey)
      );
    });
  }

  /**
   * get the active private key
   * @returns
   */
  getActiveKeyDecrypted() {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const activeIndex = this.db.get("ziden-active-index");
    if (!activeIndex) {
      throw Error(NO_ACTIVE_AUTH);
    }
    const privateKeyEncrypted = this.getKey(activeIndex);
    return this.decrypt(privateKeyEncrypted);
  }

  /**
   * get a private key given the index
   * @returns
   */
  getKeyDecrypted(index: number) {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const privateKeyEncrypted = this.getKey(index);
    return this.decrypt(privateKeyEncrypted);
  }
  /**
   * generate dek (key for encrypt backup claim)
   * @returns
   */
  generateDekForBackup() {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const libsodium = this.getCryptoUtil();
    const dek = libsodium.crypto_secretbox_keygen("hex");
    return dek;
  }
  /**
   * generate key pair for backup claim
   * @returns
   */
  generateKeyForBackup() {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const masterSeed = this.getMasterSeed();
    const masterSeedBuffer = Buffer.from(masterSeed, "utf-8");
    const keyRoot = hdkey.fromMasterSeed(masterSeedBuffer);
    const keyPathRoot = "m/44'/0'/0";
    const Id = keyRoot.derive(keyPathRoot);
    const privateKeyBuff = Id._privateKey;
    let privateKeyHex = zidenjsUtils.bufferToHex(privateKeyBuff);
    while (privateKeyHex.length < 64) {
      privateKeyHex = "0" + privateKeyHex;
    }
    const libsodium = this.getCryptoUtil();

    let pv = libsodium.from_hex(privateKeyHex);
    const publicKeyHex = libsodium.crypto_scalarmult_base(pv, "hex");
    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex,
    };
  }

  getKeyIndexes() {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const keysList = this.db.getKeysList("ziden-privateKeyEncrypted");
    return keysList.map((key: string) =>
      parseInt(key.substring(key.lastIndexOf("/") + 1))
    );
  }

  generateUser = async () => {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const keyIndexes = this.getKeyIndexes();
    if (keyIndexes?.length > 0) return;
    const masterSeed = this.getMasterSeed();
    const masterSeedBuffer = Buffer.from(masterSeed, "utf-8");
    const keyRoot = hdkey.fromMasterSeed(masterSeedBuffer);
    const keyPathRoot = `m/44'/0'/0`;
    const Id = keyRoot.derive(keyPathRoot);
    const privateKey = Id._privateKey.toString("hex");
    this.db.insert(`ziden-privateKeyEncrypted/0`, this.encrypt(privateKey));

    await this.generateUserTree();
    this.activateKey(0);
  };

  addNewKey = async (handler: any) => {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const keyIndexes = this.getKeyIndexes();
    if (keyIndexes?.length === 0) return;
    const userTree = await this.getUserTree();
    const index = userTree.authRevNonce;

    const masterSeed = this.getMasterSeed();
    const masterSeedBuffer = Buffer.from(masterSeed, "utf-8");
    const keyRoot = hdkey.fromMasterSeed(masterSeedBuffer);
    const keyPathRoot = `m/44'/0'/${index}`;
    const Id = keyRoot.derive(keyPathRoot);
    const privateKey = Id._privateKey.toString("hex");
    const privateKeyBuff = zidenjsUtils.hexToBuffer(privateKey, 32);
    let newAuth = auth.newAuthFromPrivateKey(privateKeyBuff);

    const activeKey = this.getActiveKey();
    const activeAuth = this.getActiveAuth();

    const witness = await stateTransition.stateTransitionWitnessWithPrivateKey(
      activeKey,
      activeAuth,
      userTree,
      [newAuth],
      [],
      [],
      []
    );

    console.log(witness);

    try {
      await handler(witness);
      this.replicateLevelDbs();
      this.db.insert(
        `ziden-privateKeyEncrypted/${index}`,
        this.encrypt(privateKey)
      );
      this.db.insert(AUTH_REV_NONCE_DB_PATH, userTree.authRevNonce);
    } catch (err) {
      this.recoverLevelDbs();
      throw err;
    }
    return witness;
  };

  removeKey = async (index: number, handler: any) => {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const keyIndexes = this.getKeyIndexes();
    if (keyIndexes.length === 0 || keyIndexes.indexOf(index) === -1) {
      throw Error(NO_KEY_MATCH);
    }
    if (keyIndexes.length === 1) {
      throw Error(NO_KEY_LEFT);
    }

    const activeIndex = this.db.get("ziden-active-index");
    if (index === parseInt(activeIndex)) {
      const newActivatedIndex =
        keyIndexes[keyIndexes.indexOf(index) === 0 ? 1 : 0];
      this.activateKey(newActivatedIndex);
    }
    const userTree = await this.getUserTree();
    const activeKey = this.getActiveKey();
    const activeAuth = this.getActiveAuth();

    const witness = await stateTransition.stateTransitionWitnessWithPrivateKey(
      activeKey,
      activeAuth,
      userTree,
      [],
      [],
      [BigInt(index)],
      []
    );

    try {
      await handler(witness);
      this.replicateLevelDbs();
      this.db.insert(AUTH_REV_NONCE_DB_PATH, userTree.authRevNonce);
      this.db.delete(`ziden-privateKeyEncrypted/${index}`);
    } catch (err) {
      this.recoverLevelDbs();
      throw err;
    }
  };

  activateKey = (index: number) => {
    if (!this.isUnlock()) {
      throw Error(WALLET_LOCKED_MESSAGE);
    }
    const keyIndexes = this.getKeyIndexes();
    if (keyIndexes.length === 0 || keyIndexes.indexOf(index) === -1) {
      throw Error(NO_KEY_MATCH);
    }
    this.db.insert("ziden-active-index", index);
  };

  getActiveKey = () => {
    const activeIndex = this.db.get("ziden-active-index");
    const privateKeyHex = this.getKeyDecrypted(activeIndex);
    return zidenjsUtils.hexToBuffer(privateKeyHex, 32);
  };
  getActiveAuth = () => {
    const activeIndex = this.db.get("ziden-active-index");
    if (!activeIndex) {
      throw Error(NO_ACTIVE_AUTH);
    }
    return this.getAuthClaim(parseInt(activeIndex));
  };

  checkPassword = (password: string) => {
    return (
      Buffer.compare(this.encryptionKey, this.getEncryptionKey(password)) === 0
    );
  };
}

// master seed
// private keys
// data-key
