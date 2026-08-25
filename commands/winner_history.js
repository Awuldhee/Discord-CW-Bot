const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const config = require("../config.json");
const {
    formatUtcDate,
    getWinnerHistorySnapshot
} = require("../utils/winnerEligibility");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("winner_history")
        .setDescription("View winner eligibility history.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Select a user")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const target = interaction.options.getUser("user");
        const db = client.db;
        const snapshot = getWinnerHistorySnapshot(db, target.id);

        const lines = snapshot.winDates.length > 0
            ? [...snapshot.winDates]
                .sort((a, b) => a - b)
                .map(date => `• ${formatUtcDate(date)} → Top 3`)
                .join("\n")
            : "None";

        const status = snapshot.eligible ? "✅ Eligible" : "❌ Not Eligible";
        const eligibleBack = snapshot.eligibleAgain
            ? formatUtcDate(snapshot.eligibleAgain)
            : "-";
        const periodStart = snapshot.periodStart
            ? formatUtcDate(snapshot.periodStart)
            : "-";
        const periodEnd = snapshot.periodEnd
            ? formatUtcDate(snapshot.periodEnd)
            : "-";

        const embed = new EmbedBuilder()
            .setColor(snapshot.eligible ? 0x57F287 : 0xED4245)
            .setTitle(`🏆 Winner History — ${target.username}`)
            .setDescription(
                `${lines}\n\n` +
                `**User ID:** ${target.id}\n` +
                `**Total:** ${snapshot.count}/2 Top 3\n` +
                `**Status:** ${status}\n` +
                `**Period:** ${periodStart} - ${periodEnd}\n` +
                `**Eligible Again:** ${eligibleBack}`
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};
