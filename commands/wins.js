const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const config = require("../config.json");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("wins")
        .setDescription("Manage a user's Weekly Wins.")
        .addStringOption(option =>
            option
                .setName("action")
                .setDescription("Select action")
                .setRequired(true)
                .addChoices(
                    {
                        name: "Add",
                        value: "add"
                    },
                    {
                        name: "Remove",
                        value: "remove"
                    }
                )
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Select a user")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("wins")
                .setDescription("Amount of Weekly Wins")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000)
        ),

    async execute(interaction, client) {

        // ==========================
        // Moderator Only
        // ==========================

        if (!interaction.member.roles.cache.has(config.moderatorRole)) {

            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
                flags: MessageFlags.Ephemeral
            });

        }

        const action = interaction.options.getString("action");
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("wins");

        if (target.bot) {

            return interaction.reply({
                content: "❌ You cannot edit a bot's Weekly Wins.",
                flags: MessageFlags.Ephemeral
            });

        }

        const db = client.db;

        // ==========================
        // Create User If Not Exists
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
                target.id,
                target.username
            );

            user = {
                discord_id: target.id,
                username: target.username,
                points: 0,
                wins: 0
            };

        }

        // wins dan points HARUS sync — 1 win = 1 point
        let newWins = user.wins;
        let newPoints = user.points;

        if (action === "add") {
            newWins += amount;
            newPoints += amount;
        } else {
            newWins = Math.max(user.wins - amount, 0);
            newPoints = Math.max(user.points - amount, 0);
        }

        // ==========================
        // Update Database
        // ==========================

        db.prepare(`
            UPDATE users
            SET
                username = ?,
                wins = ?,
                points = ?
            WHERE discord_id = ?
        `).run(
            target.username,
            newWins,
            newPoints,
            target.id
        );

        // ==========================
        // Embed
        // ==========================

        const embed = new EmbedBuilder()
            .setColor(action === "add" ? "Green" : "Red")
            .setTitle("🏆 Weekly Wins Updated")
            .addFields(
                {
                    name: "User",
                    value: `<@${target.id}>`,
                    inline: true
                },
                {
                    name: "Action",
                    value: action === "add" ? "Added" : "Removed",
                    inline: true
                },
                {
                    name: "Wins",
                    value: `${action === "add" ? "+" : "-"}${amount}`,
                    inline: true
                },
                {
                    name: "Current Weekly Wins",
                    value: `${newWins}`,
                    inline: true
                },
                {
                    name: "Current Weekly Points",
                    value: `${newPoints}`,
                    inline: true
                }
            )
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });

    }

};