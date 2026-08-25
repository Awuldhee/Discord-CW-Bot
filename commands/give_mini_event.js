const {
    SlashCommandBuilder
} = require("discord.js");

const config = require("../config.json");
const {
    getWinnerState,
    formatUtcDate
} = require("../utils/winnerEligibility");

const categories = [
    "Rumble",
    "SmashKarts",
    "Gartic",
    "Kahoot",
    "Duck Race",
    "Skribbl",
    "Stumble Guys",
    "Codebreakers",
    "Openfront",
    "Lolbeans",
    "Tetris",
    "Guess the Winner",
    "Score Prediction"
];

module.exports = {

    data: new SlashCommandBuilder()
        .setName("give_mini_event")
        .setDescription("Give Weekly Points for Mini Event.")
        .addStringOption(option => {

            option
                .setName("category")
                .setDescription("Select Mini Event Category")
                .setRequired(true);

            categories.forEach(category => {
                option.addChoices({
                    name: category,
                    value: category
                });
            });

            return option;

        })
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
                .setMaxValue(1)
        ),

    async execute(interaction, client) {

        // Moderator Only
        if (!interaction.member.roles.cache.has(config.moderatorRole)) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
            });
        }

        const category = interaction.options.getString("category");
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("points");

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

        // ==========================
        // Create user if not exists
        // ==========================

        let user = db.prepare(`
            SELECT *
            FROM users
            WHERE discord_id = ?
        `).get(target.id);

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

        // ==========================
        // UTC Today
        // ==========================

        const now = new Date();

        const startUTC = Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0,
            0,
            0
        ) / 1000;

        const endUTC = startUTC + 86400;

        // ==========================
        // Check Winner Today
        // ==========================

        const alreadyWon = db.prepare(`
            SELECT id
            FROM mini_event_history
            WHERE discord_id = ?
            AND category = ?
            AND created_at >= ?
            AND created_at < ?
            LIMIT 1
        `).get(
            target.id,
            category,
            startUTC,
            endUTC
        );

        if (alreadyWon) {

            return interaction.reply({
                content: `❌ ${target} has already won **${category}** today.`
            });

        }

        // ==========================
        // Give Points & Wins
        // ==========================
        // Give Points & Wins (timeout-safe)
        // ==========================
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

        // ==========================
        // Save History
        // ==========================
        db.prepare(`
            INSERT INTO mini_event_history
            (
                discord_id,
                username,
                category,
                points,
                created_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `).run(
            target.id,
            target.username,
            category,
            amount,
            Math.floor(Date.now() / 1000)
        );

        await interaction.editReply({
            content: `Gave **${amount.toLocaleString()} Weekly Points** to ${target}\n Category: **${category}**`
        });

    }

};