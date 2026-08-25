const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Pastikan folder database ada
const dbFolder = path.join(__dirname);

if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

// Lokasi database
const dbPath = path.join(dbFolder, "database.db");

// Membuat / membuka database
const db = new Database(dbPath);

// Performance
db.pragma("journal_mode = WAL");
// ponytail: periodic WAL checkpoint supaya WAL file tidak tumbuh & cause lock contention -> interaction timeout (10062)
db.pragma("wal_autocheckpoint = 1000");
db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").run();

// ==========================
// USERS TABLE
// ==========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
    discord_id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    points INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    first_point_at INTEGER
)
`).run();

// ==========================
// Tambahkan kolom wins jika
// database lama belum memilikinya
// ==========================

const columns = db.prepare(`
    PRAGMA table_info(users)
`).all();

const hasWins = columns.some(column => column.name === "wins");

if (!hasWins) {

    db.prepare(`
        ALTER TABLE users
        ADD COLUMN wins INTEGER DEFAULT 0
    `).run();

    console.log("✅ Added 'wins' column to users table.");

}

const hasFirstPoint = columns.some(

    column =>

        column.name === "first_point_at"

);

if (!hasFirstPoint) {

    db.prepare(`
        ALTER TABLE users
        ADD COLUMN first_point_at INTEGER
    `).run();

    console.log(

        "✅ Added 'first_point_at' column to users table."

    );

}

// ==========================
// MINI EVENT HISTORY
// ==========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS mini_event_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        discord_id TEXT NOT NULL,
        username TEXT NOT NULL,
        category TEXT NOT NULL,
        points INTEGER NOT NULL,
        created_at INTEGER NOT NULL
    )
`).run();

// ==========================
// WINNER HISTORY
// ==========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS winner_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        period_start INTEGER NOT NULL,
        period_end INTEGER NOT NULL,
        week_start INTEGER NOT NULL,
        week_end INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        discord_id TEXT NOT NULL,
        username TEXT NOT NULL,
        points INTEGER NOT NULL,
        wins INTEGER NOT NULL DEFAULT 0,
        saved_at INTEGER NOT NULL,
        UNIQUE(period_start, week_start, discord_id)
    )
`).run();

// ==========================
// LEADERBOARD HISTORY
// ==========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS leaderboard_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start INTEGER NOT NULL,
        week_end INTEGER NOT NULL,
        rank INTEGER NOT NULL,
        discord_id TEXT NOT NULL,
        username TEXT NOT NULL,
        points INTEGER NOT NULL,
        wins INTEGER NOT NULL DEFAULT 0,
        saved_at INTEGER NOT NULL
    )
`).run();

// ==========================
// Tambahkan kolom wins jika
// leaderboard_history lama
// belum memilikinya
// ==========================

const historyColumns = db.prepare(`
    PRAGMA table_info(leaderboard_history)
`).all();

const hasHistoryWins = historyColumns.some(column => column.name === "wins");

if (!hasHistoryWins) {

    db.prepare(`
        ALTER TABLE leaderboard_history
        ADD COLUMN wins INTEGER DEFAULT 0
    `).run();

    console.log("✅ Added 'wins' column to leaderboard_history.");

}

// ==========================
// SYSTEM SETTINGS
// ==========================

db.prepare(`
    CREATE TABLE IF NOT EXISTS system_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL
    )
`).run();

const setting = db.prepare(`
    SELECT *
    FROM system_settings
    WHERE setting_key = 'last_week_reset'
`).get();

if (!setting) {

    db.prepare(`
        INSERT INTO system_settings
        (
            setting_key,
            setting_value
        )
        VALUES
        (
            'last_week_reset',
            '0'
        )
    `).run();

}

console.log("📁 SQLite Database Connected");

db.backupDatabase = async function (destination) {

    await db.backup(destination);

};

module.exports = db;