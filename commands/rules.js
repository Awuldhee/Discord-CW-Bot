const {
    SlashCommandBuilder,
    EmbedBuilder,
    MessageFlags
} = require("discord.js");

const config = require("../config.json");

module.exports = {

    data: new SlashCommandBuilder()
        .setName("rules")
        .setDescription("View the Weekly Leaderboard rules."),

    async execute(interaction) {

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

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle("Weekly Leaderboard Challenge")
            .setDescription(
`Please read and follow the rules below to remain eligible for the Weekly Leaderboard.

###  Rules:

• **Maximum Consecutive Wins**
You may only appear on the Weekly Leaderboard **twice consecutively** (up to a maximum of **2 wins per month**).

• **Event Eligibility**
If the **1st place** winner is not eligible, the Weekly Leaderboard reward will automatically be passed to the next eligible participant.

• **Mini-Event Limit**
For **Mini-Events**, Weekly Leaderboard points can only be earned **once per Mini-Event category per UTC day**.`
            )
            .setFooter({
                text: "Weekly Leaderboard Challenge"
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });

    }

};