const fs = require("fs");
const path = require("path");

const config = require("./config");
const { createBackup, BACKUP_NAME } = require("./sqliteBackup");
const { uploadBackup } = require("./driveUploader");

let isRunning = false;

// =========================================
// Backup Database
// =========================================

async function runBackup() {

    if (isRunning) {

        console.log("⏳ Backup masih berjalan, dilewati.");

        return;

    }

    isRunning = true;

    try {

        console.log("======================================");
        console.log("📦 Memulai Backup Database...");

        // Copy database SQLite
        const backupPath = await createBackup();

        // Upload / Replace ke Google Drive
        await uploadBackup(backupPath);

        // Hapus file sementara
        if (fs.existsSync(backupPath)) {

            fs.unlinkSync(backupPath);

        }

        console.log("✅ Backup selesai.");
        console.log("======================================");

    } catch (err) {

        console.error("❌ Backup gagal.");

        console.error(err);

    }

    isRunning = false;

}

module.exports = {

    runBackup

};