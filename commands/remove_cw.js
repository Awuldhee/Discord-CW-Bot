const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const config = require("../config.json");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("remove_cw")
        .setDescription("Remove CW Points from a user.")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Select a user")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("points")
                .setDescription("Amount of points to remove")
                .setMinValue(1)
                .setRequired(true)
        ),

    async execute(interaction, client) {

        // Moderator Only
        if (!interaction.member.roles.cache.has(config.moderatorRole)) {
            return interaction.reply({
                content: "❌ You don't have permission to use this command.",
                flags: MessageFlags.Ephemeral
            });
        }

        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("points");

        const db = client.db;

        // Cari user
        const user = db.prepare(`
            SELECT *
            FROM users
            WHERE discord_id = ?
        `).get(target.id);

        if (!user) {
            return interaction.reply({
                content: "❌ This user has no CW Points yet.",
                flags: MessageFlags.Ephemeral
            });
        }

        // Delete N latest entries from mini_event_history
        const deleted = db.prepare(`DELETE FROM mini_event_history WHERE discord_id = ? AND id IN (SELECT id FROM mini_event_history WHERE discord_id = ? ORDER BY created_at DESC LIMIT ?)`).run(target.id, target.id, amount);

        // Always -1 win regardless of entries deleted
        const userAfter = db.prepare(`SELECT points, wins FROM users WHERE discord_id = ?`).get(target.id);
        const newPoints = Math.max((userAfter?.points || 0) - amount, 0);
        const newWins = Math.max((userAfter?.wins || 0) - 1, 0);

        // Recalculate first_point_at from remaining mini_event_history
        const remaining = db.prepare(`SELECT MIN(created_at) as first_point_at FROM mini_event_history WHERE discord_id = ?`).get(target.id);
        const newFirstPoint = remaining?.first_point_at || null;

        db.prepare(`UPDATE users SET username = ?, points = ?, wins = ?, first_point_at = ? WHERE discord_id = ?`).run(
            target.username, newPoints, newWins, newFirstPoint, target.id
        );

        await interaction.reply({
            content: `❌ Removed **${amount.toLocaleString()} Points** and **1 Win** from ${target}\nCurrent Points: **${newPoints}** | Current Wins: **${newWins}**`
        });

    }

};