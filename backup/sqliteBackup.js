const fs = require("fs");
const path = require("path");

const db = require("../database/database");
const config = require("./config");

const BACKUP_NAME = "database_latest.db";

async function createBackup() {

    if (!fs.existsSync(config.backupFolder)) {

        fs.mkdirSync(config.backupFolder, {

            recursive: true

        });

    }

    const backupPath = path.join(

        config.backupFolder,

        BACKUP_NAME

    );

    await db.backupDatabase(backupPath);

    console.log("✅ SQLite Backup Created");

    return backupPath;

}

module.exports = {

    createBackup,

    BACKUP_NAME

};