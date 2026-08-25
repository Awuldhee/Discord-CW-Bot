const fs = require("fs");

const config = require("./config");
const { runBackup } = require("./backupManager");

let debounceTimer = null;

// =========================================
// Backup setiap interval
// =========================================

function startIntervalBackup() {

    const interval = config.interval * 60 * 1000;

    setInterval(async () => {

        console.log("⏰ Scheduled Backup");

        await runBackup();

    }, interval);

}

// =========================================
// Backup saat database berubah
// =========================================

function watchDatabase() {

    fs.watch(config.databaseFile, () => {

        console.log("📄 Database Changed");

        if (debounceTimer) {

            clearTimeout(debounceTimer);

        }

        debounceTimer = setTimeout(async () => {

            console.log("📦 Backup after database changed");

            await runBackup();

        }, config.debounce * 1000);

    });

}

// =========================================
// Start Scheduler
// =========================================

async function startScheduler() {

    console.log("======================================");
    console.log("🚀 Backup Scheduler Started");
    console.log(`⏰ Interval : ${config.interval} Minute(s)`);
    console.log(`📄 Debounce : ${config.debounce} Second(s)`);
    console.log("======================================");

    console.log("📦 Startup Backup");

    await runBackup();

    startIntervalBackup();

    watchDatabase();

}

module.exports = {

    startScheduler

};