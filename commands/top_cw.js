const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const config = require("../config.json");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("top_cw")
        .setDescription("View the current weekly Top 10 leaderboard."),

    async execute(interaction, client) {

        // ==========================
        // Bot Commands Channel Only
        // ==========================

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

        // ==========================
        // Get Top 10
        // ==========================

        const leaderboard = db.prepare(`
            SELECT
                discord_id,
                username,
                points,
                wins
            FROM users
            ORDER BY
                points DESC,
                wins DESC,
                first_point_at ASC
            LIMIT 10
        `).all();

        if (leaderboard.length === 0) {

            return interaction.reply({
                content: "📊 The leaderboard is currently empty.",
                flags: MessageFlags.Ephemeral
            });

        }

        // ==========================
        // Table Size
        // ==========================

        const noWidth = 3;
const usernameWidth = 16;
const pointsWidth = 4;
const winsWidth = 4;

const line = "─".repeat(
    noWidth +
    usernameWidth +
    pointsWidth +
    winsWidth +
    1
);

let table = "";

table +=
    "No".padEnd(noWidth) +
    "Username".padEnd(usernameWidth) +
    "Pts".padStart(pointsWidth) +
    " " +
    "Wins".padStart(winsWidth) +
    "\n";

table += line + "\n\n";


                // ==========================
        // Build Leaderboard Table
        // ==========================

        leaderboard.forEach((user, index) => {

    let username = user.username;

    if (username.length > usernameWidth) {

        username =
            username.substring(0, usernameWidth - 3) + "...";

    }

    table +=
    String(index + 1).padEnd(noWidth) +
    username.padEnd(usernameWidth) +
    String(user.points).padStart(pointsWidth) +
    " " +
    String(user.wins).padStart(winsWidth) +
    "\n";

});

                     // ==========================
        // User Rank
        // ==========================

        const me = db.prepare(`
            SELECT
                points,
                wins
            FROM users
            WHERE discord_id = ?
        `).get(interaction.user.id);

        let footer = "";

        if (me) {

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
                me.points,
                me.points,
                me.wins,
                me.points,
                me.wins,
                interaction.user.id
            );

            footer =
`Your Rank: #${rank.rank}
Reset: Monday 00:00 UTC`;

        }

        // ==========================
        // Embed
        // ==========================

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle("Weekly CW Leaderboard")
            .setDescription(
    "```text\n" +
    table +
    "\n" +
    line +
    "\n\n" +
    footer +
    "\n```"
)
            

        await interaction.reply({
            embeds: [embed]
        });

    }

};