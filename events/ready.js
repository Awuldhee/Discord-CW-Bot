const { Events, ActivityType } = require("discord.js");
const checkWeeklyReset = require("../utils/weeklyReset");

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {

        console.clear();

        console.log("=================================");
        console.log("🤖 Discord CW Bot");
        console.log("=================================");
        console.log(`✅ Logged in as : ${client.user.tag}`);
        console.log(`🆔 Bot ID       : ${client.user.id}`);
        console.log(`🌐 Servers      : ${client.guilds.cache.size}`);
        console.log("=================================");

        // Status Bot
        client.user.setPresence({
            activities: [
                {
                    name: "/top_cw",
                    type: ActivityType.Watching
                }
            ],
            status: "online"
        });

        // Jalankan pengecekan reset saat bot online
        await checkWeeklyReset(client);

        // Cek setiap 1 menit
        setInterval(async () => {
            await checkWeeklyReset(client);
        }, 60 * 1000);

    }
};