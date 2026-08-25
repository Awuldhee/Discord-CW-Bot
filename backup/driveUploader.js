const fs = require("fs");
const { google } = require("googleapis");

const path = require("path");
const config = require("./config");

const credentialsPath = path.resolve(
    __dirname,
    "..",
    process.env.GOOGLE_CLIENT_SECRET || "credentials/client_secret.json"
);

const tokenPath = path.resolve(
    __dirname,
    "..",
    process.env.GOOGLE_TOKEN || "credentials/token.json"
);

const credentials = require(credentialsPath);
const token = require(tokenPath);

// =========================================
// OAuth2
// =========================================

const {
    client_secret,
    client_id,
    redirect_uris
} = credentials.installed;

const auth = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
);

auth.setCredentials(token);

const drive = google.drive({
    version: "v3",
    auth
});

// =========================================
// Cari database_latest.db
// =========================================

async function findBackupFile() {

    const res = await drive.files.list({

        q: `name='database_latest.db' and trashed=false`,

        fields: "files(id,name,parents)",

        supportsAllDrives: true,

        includeItemsFromAllDrives: true

    });

    return res.data.files[0] || null;

}

// =========================================
// Upload Baru
// =========================================

async function createBackup(filePath) {

    const response = await drive.files.create({

        requestBody: {

            name: "database_latest.db"

        },

        media: {

            mimeType: "application/octet-stream",

            body: fs.createReadStream(filePath)

        },

        fields: "id,name"

    });

    await drive.files.update({

        fileId: response.data.id,

        addParents: config.folderId,

        supportsAllDrives: true

    });

    console.log("✅ Backup pertama berhasil dibuat.");

}

// =========================================
// Replace Isi File
// =========================================

async function updateBackup(fileId, filePath) {

    await drive.files.update({

        fileId,

        media: {

            mimeType: "application/octet-stream",

            body: fs.createReadStream(filePath)

        },

        supportsAllDrives: true

    });

    console.log("♻️ Backup berhasil diperbarui.");

}

// =========================================
// Upload / Replace
// =========================================

async function uploadBackup(filePath) {

    const existing = await findBackupFile();

    if (!existing) {

        return await createBackup(filePath);

    }

    return await updateBackup(
        existing.id,
        filePath
    );

}

module.exports = {

    uploadBackup

};