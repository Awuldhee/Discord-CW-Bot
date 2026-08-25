const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const config = require("../config.json");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("history")
        .setDescription("View last week's leaderboard."),

    async execute(interaction, client) {

        if (!interaction.member.roles.cache.has(config.moderatorRole)) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        const db = client.db;

        // Ambil leaderboard minggu terakhir
        const latest = db.prepare(`
            SELECT MAX(week_start) AS week_start
            FROM leaderboard_history
        `).get();

        if (!latest.week_start) {
            return interaction.reply({
                content: "📊 No leaderboard history found.",
                flags: MessageFlags.Ephemeral
            });
        }

        const leaderboard = db.prepare(`
    SELECT *
FROM leaderboard_history
WHERE week_start = ?
ORDER BY rank ASC
`).all(latest.week_start);

        if (leaderboard.length === 0) {
            return interaction.reply({
                content: "📊 No leaderboard rows found for the latest week.",
                flags: MessageFlags.Ephemeral
            });
        }

        const weekStart = new Date(latest.week_start * 1000);
        const weekEnd = new Date(leaderboard[0].week_end * 1000);

        const formatDate = (date) => {

            return date.toLocaleDateString("en-GB", {
                timeZone: "UTC",
                day: "2-digit",
                month: "short",
                year: "numeric"
            });

        };

        let description = "";

        leaderboard.forEach((user, index) => {

    let medal = `${index + 1}.`;

    if (index === 0) medal = "🥇";
    if (index === 1) medal = "🥈";
    if (index === 2) medal = "🥉";

    description +=
`${medal} <@${user.discord_id}> • **${user.points.toLocaleString()} Points • ${user.wins.toLocaleString()} Wins**\n`;

});

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📜 Previous Week Leaderboard")
            .setDescription(description)
            .setFooter({
                text: `${formatDate(weekStart)} - ${formatDate(weekEnd)} (UTC)`
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });

    }

};