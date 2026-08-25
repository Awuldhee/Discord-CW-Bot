const fs = require("fs");
const path = require("path");

const { REST, Routes } = require("discord.js");

const config = require("./config.json");
require("dotenv").config();

const commands = [];

const commandsPath = path.join(__dirname, "commands");

const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith(".js"));

for (const file of commandFiles) {

    const command = require(path.join(commandsPath, file));

    commands.push(command.data.toJSON());

}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {

    try {

        console.log(`🚀 Registering ${commands.length} slash command(s)...`);

        const guildIds = Array.isArray(config.guildIds)
            ? config.guildIds
            : [config.guildIds];

        for (const guildId of guildIds) {

            await rest.put(
                Routes.applicationGuildCommands(
                    config.clientId,
                    guildId
                ),
                {
                    body: commands
                }
            );

            console.log(`✅ Registered commands to Guild: ${guildId}`);

        }

        console.log("🎉 All Slash Commands Registered!");

    } catch (error) {

        console.error(error);

    }

})();