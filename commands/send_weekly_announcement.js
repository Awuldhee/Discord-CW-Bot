const {
    SlashCommandBuilder,
    MessageFlags
} = require("discord.js");

const config = require("../config.json");
const sendWeeklyAnnouncement = require("../utils/weeklyAnnouncement");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("send_weekly_announcement")
        .setDescription("Send the Weekly Leaderboard announcement."),

    async execute(interaction, client) {

        // Moderator Only
        if (!interaction.member.roles.cache.has(config.moderatorRole)) {

            return interaction.reply({
                content: "❌ You don't have permission.",
                flags: MessageFlags.Ephemeral
            });

        }

        try {

           const sent = await sendWeeklyAnnouncement(client);

if (!sent) {
    return interaction.reply({
        content: "❌ No leaderboard data found.",
        flags: MessageFlags.Ephemeral
    });
}

await interaction.reply({
    content: "✅ Weekly announcement sent successfully.",
    flags: MessageFlags.Ephemeral
});

        } catch (err) {

    console.error(err);

    await interaction.reply({
        content: `❌ ${err.message}`,
        flags: MessageFlags.Ephemeral
    });

}

    }

};