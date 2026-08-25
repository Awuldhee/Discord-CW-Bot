const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const config = require("../config.json");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("my_points")
        .setDescription("View your current CW Points and weekly rank."),

    async execute(interaction, client) {

        // Bot Commands Channel Only
        const allowedChannels = [
    config.botCommandsChannel,
    config.botCommandsChannelv2
];

if (!allowedChannels.includes(interaction.channelId)) {
            return interaction.reply({
                content: `❌ Please use this command in <#${config.botCommandsChannel}>.`,
                flags: MessageFlags.Ephemeral
            });
        }

        const db = client.db;

        let user = db.prepare(`
            SELECT *
            FROM users
            WHERE discord_id = ?
        `).get(interaction.user.id);

        // Jika belum ada
        if (!user) {

            db.prepare(`
                INSERT INTO users
                (
                    discord_id,
                    username,
                    points,
                    wins
                )
                VALUES
                (
                    ?,
                    ?,
                    0,
                    0
                )
            `).run(
                interaction.user.id,
                interaction.user.username
            );

            user = {
                discord_id: interaction.user.id,
                username: interaction.user.username,
                points: 0,
                wins: 0
            };

        }

        // Update username
        db.prepare(`
            UPDATE users
            SET username = ?
            WHERE discord_id = ?
        `).run(
            interaction.user.username,
            interaction.user.id
        );

        // Ambil data terbaru
        user = db.prepare(`
            SELECT *
            FROM users
            WHERE discord_id = ?
        `).get(interaction.user.id);

        // Ranking
        const rank = db.prepare(`
            SELECT COUNT(*) + 1 AS rank
            FROM users
            WHERE
                points > ?
OR (
    points = ?
    AND wins > ?
)
OR (
    points = ?
    AND wins = ?
    AND COALESCE(first_point_at, 0) <
    (
        SELECT COALESCE(first_point_at, 0)
        FROM users
        WHERE discord_id = ?
    )
)
        `).get(
    user.points,
    user.points,
    user.wins,
    user.points,
    user.wins,
    interaction.user.id
);

        const usernameWidth = 16;
const pointsWidth = 6;
const winsWidth = 5;

const line = "─".repeat(
    usernameWidth +
    pointsWidth +
    winsWidth
);

        let username = user.username;

        if (username.length > usernameWidth - 1) {
            username =
                username.substring(0, usernameWidth - 4) + "...";
        }

        let table = "";

table +=
    "Username".padEnd(usernameWidth) +
    "Pts".padStart(pointsWidth) +
    " " +
    "Wins".padStart(winsWidth) +
    "\n";

table += line + "\n\n";

table +=
    username.padEnd(usernameWidth) +
    user.points
        .toLocaleString()
        .padStart(pointsWidth) +
    " " +
    user.wins
        .toString()
        .padStart(winsWidth);

                const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle("🏆 My CW Points")
            .setDescription(
    "```text\n" +
    table +
    "\n\n" +
    line +
    "\n\n" +
    `Rank : #${rank.rank}\n` +
    `Reset: Monday 00:00 UTC` +
    "\n```"
);
            

        await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral
        });

    }

};