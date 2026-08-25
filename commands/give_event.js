const {
    SlashCommandBuilder
} = require("discord.js");

const config = require("../config.json");
const {
    getWinnerState,
    formatUtcDate
} = require("../utils/winnerEligibility");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("give_event")
        .setDescription("Give Weekly Points to a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Select a user")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("points")
                .setDescription("Amount of Incentiv Points")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(3)
        ),

    async execute(interaction, client) {

        // Moderator Only
        if (!interaction.member.roles.cache.has(config.moderatorRole)) {

            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
            });

        }

        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("points");

        // Tidak boleh memberi poin ke bot
        if (target.bot) {

            return interaction.reply({
                content: "❌ You cannot give points to a bot.",
            });

        }

        const db = client.db;
        const nowUTC = Math.floor(Date.now() / 1000);
        const state = getWinnerState(db, target.id, nowUTC);

        if (!state.eligible) {
            return interaction.reply({
                content:
                    `❌ **${target.username}** is not eligible for this week.\n` +
                    `${target.username} has already won Top 3 **${state.count} times** within the 4-week period.\n` +
                    `Eligible again: **${formatUtcDate(state.eligibleAgain)}**`
            });
        }

        // Cari user
        let user = db.prepare(`
            SELECT *
            FROM users
            WHERE discord_id = ?
        `).get(target.id);

        // Jika belum ada
        if (!user) {

            db.prepare(`
                INSERT INTO users
                (
                    discord_id,
                    username,
                    points,
                    wins,
                    first_point_at
                )
                VALUES
                (
                    ?,
                    ?,
                    0,
                    0,
                    NULL
                )
            `).run(
                target.id,
                target.username
            );

        }

        // Tambahkan Points & Wins
        // ponytail: deferReply supaya interaction tidak timeout
                await interaction.deferReply();
                db.prepare(`
                    UPDATE users
                    SET
                        username = ?,
                        points = points + ?,
                        wins = wins + 1,
                        first_point_at = COALESCE(
                            first_point_at,
                            ?
                        )
                    WHERE discord_id = ?
                `).run(
                    target.username,
                    amount,
                    nowUTC,
                    target.id
                );

        // Insert event history (for remove_cw recalculation)
        db.prepare(`
            INSERT INTO mini_event_history
            (
                discord_id,
                username,
                category,
                points,
                created_at
            )
            VALUES (?, ?, ?, ?, ?)
        `).run(
            target.id,
            target.username,
            "Event",
            amount,
            nowUTC
        );

        await interaction.editReply({
            content: `Gave **${amount.toLocaleString()} Weekly Points** to ${target}\n Category: **Event**`
        });

    }

};