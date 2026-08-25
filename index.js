require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
    Client,
    Collection,
    GatewayIntentBits
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers
    ]
});

// ==========================
// Commands
// ==========================

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

    const command = require(path.join(commandsPath, file));

    client.commands.set(command.data.name, command);

    console.log(`✅ Loaded Command : ${command.data.name}`);

}

// ==========================
// Events
// ==========================

const eventsPath = path.join(__dirname, "events");

const eventFiles = fs
    .readdirSync(eventsPath)
    .filter(file => file.endsWith(".js"));

for (const file of eventFiles) {

    const event = require(path.join(eventsPath, file));

    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }

    console.log(`📌 Loaded Event : ${event.name}`);

}

// ==========================
// Database
// ==========================

client.db = require("./database/database");

const { startScheduler } = require("./backup/scheduler");
startScheduler();

// ==========================
// Weekly Reset (Senin 00:00 UTC)
// ==========================
// ponytail: hourly check is simplest (no node-cron dep); drift <= 1h
const sendWeeklyAnnouncement = require("./utils/weeklyAnnouncement");

function checkWeeklyReset() {
  const now = new Date();
  if (now.getUTCDay() !== 1) return; // 1 = Monday
  // ponytail: check last_week_reset < this Monday 00:00 UTC — catches missed resets
  // even if container started after the 00:00 window
  const thisMonday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);
  const setting = client.db.prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'last_week_reset'").get();
  const lastReset = Number(setting?.setting_value || 0);
  if (lastReset >= thisMonday) return; // already reset this week
  sendWeeklyAnnouncement(client).catch(e => console.error("Weekly reset error:", e));
}

setInterval(checkWeeklyReset, 3600000); // check tiap jam


// ==========================
// Login
// ==========================

client.login(process.env.TOKEN);