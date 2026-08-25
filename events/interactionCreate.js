const {
    Events,
    MessageFlags
} = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction, client) {

        // Hanya proses Slash Command
        if (!interaction.isChatInputCommand()) return;

        // Ambil command berdasarkan nama
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Command "${interaction.commandName}" tidak ditemukan.`);
            return;
        }

        try {

            await command.execute(interaction, client);

        } catch (error) {

            console.error(error);

            const reply = {
                content: "❌ An error occurred while executing this command.",
                flags: MessageFlags.Ephemeral
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(reply);
            } else {
                await interaction.reply(reply);
            }

        }

    }
};