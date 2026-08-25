require("dotenv").config();

const path = require("path");

module.exports = {

    // Folder backup sementara
    backupFolder: path.join(__dirname, "..", "backup_files"),

    // Lokasi database SQLite
    databaseFile: path.join(
        __dirname,
        "..",
        "database",
        "database.db"
    ),

    // Lokasi credentials Google
    credentialsFile: path.join(
        __dirname,
        "..",
        process.env.GOOGLE_CREDENTIALS
    ),

    // Folder Google Drive
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,

    // Interval backup (menit)
    interval: Number(process.env.BACKUP_INTERVAL || 30),

    // Debounce perubahan database (detik)
    debounce: Number(process.env.BACKUP_DEBOUNCE || 60)

};