require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { authenticate } = require("@google-cloud/local-auth");
const { google } = require("googleapis");

const SCOPES = [
    "https://www.googleapis.com/auth/drive"
];

const TOKEN_PATH = path.resolve(
    __dirname,
    "..",
    process.env.GOOGLE_TOKEN || "credentials/token.json"
);
const CREDENTIALS_PATH = path.resolve(
    __dirname,
    "..",
    process.env.GOOGLE_CLIENT_SECRET || "credentials/client_secret.json"
);

async function authorize() {

    const auth = await authenticate({

        scopes: SCOPES,

        keyfilePath: CREDENTIALS_PATH

    });

    const client = auth.credentials;

    fs.writeFileSync(

        TOKEN_PATH,

        JSON.stringify(client, null, 2)

    );

    console.log("✅ token.json berhasil dibuat");

}

authorize();