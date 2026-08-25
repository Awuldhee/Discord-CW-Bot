const config = require("../config.json");
const {
    startOfUtcMonday,
    recordWinner
} = require("./winnerEligibility");

async function checkWeeklyReset(client) {

    const db = client.db;

    const now = new Date();
    const nowUTC = Math.floor(now.getTime() / 1000);

    // Hanya hari Senin (UTC)
     if (now.getUTCDay() !== 1) return;

    const mondayUTC = startOfUtcMonday(nowUTC);

    const lastReset = Number(
        db.prepare(`
            SELECT setting_value
            FROM system_settings
            WHERE setting_key = 'last_week_reset'
        `).get().setting_value
    );

    // Sudah reset minggu ini
     if (lastReset >= mondayUTC) return;

    console.log("🏆 Weekly Leaderboard Reset Started...");

    // ==========================
// Weekly Leaderboard
// ==========================

const leaderboard = db.prepare(`
    SELECT
        discord_id,
        username,
        points,
        wins
    FROM users
    WHERE points > 0
    ORDER BY
        points DESC,
        wins DESC,
        first_point_at ASC
`).all();

    const previousMonday = mondayUTC - 604800;
    const weekEnd = mondayUTC - 1;

    const insertHistory = db.prepare(`
        INSERT INTO leaderboard_history
        (
            week_start,
            week_end,
            rank,
            discord_id,
            username,
            points,
            wins,
            saved_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    leaderboard.forEach((user, index) => {

        insertHistory.run(
            previousMonday,
            weekEnd,
            index + 1,
            user.discord_id,
            user.username,
            user.points,
            user.wins,
            nowUTC
        );

        if (index < 3) {
            recordWinner(
                db,
                {
                    rank: index + 1,
                    discordId: user.discord_id,
                    username: user.username,
                    points: user.points,
                    wins: user.wins
                },
                previousMonday,
                nowUTC
            );
        }

    });

    // ==========================
    // Announcement
    // ==========================

    try {

        const channel = await client.channels.fetch(config.leaderboardChannel);

        if (channel && leaderboard.length > 0) {

            

            // ==========================
// Reward
// ==========================

const rewards = [
    "25$ USDC",
    "15$ USDC",
    "10$ USDC"
];

// ==========================
// Top 3
// ==========================

let winners = "";

leaderboard.slice(0, 3).forEach((user, index) => {

    winners +=
`${index + 1}. <@${user.discord_id}> • ${user.points} Points • ${user.wins} Wins • ${rewards[index]}
`;

});

// ==========================
// Everyone Who Scored Points
// (exclude Top 3)
// ==========================

const everyone = leaderboard;

const top3Ids = new Set(
    leaderboard
        .slice(0, 3)
        .map(user => user.discord_id)
);

const grouped = {};

for (const user of everyone) {

    if (top3Ids.has(user.discord_id)) continue;

    const key = `${user.points}|${user.wins}`;

    if (!grouped[key]) {

        grouped[key] = [];

    }

    grouped[key].push(`<@${user.discord_id}>`);

}

let everyoneText = "";

// ==========================
// Build Everyone Text
// ==========================

Object.keys(grouped)
    .sort((a, b) => {

        const [pointsA, winsA] = a.split("|").map(Number);
        const [pointsB, winsB] = b.split("|").map(Number);

        if (pointsB !== pointsA) {
            return pointsB - pointsA;
        }

        return winsB - winsA;

    })
    .forEach(key => {

        const [points, wins] = key.split("|");

        everyoneText +=
`**${points} ${Number(points) === 1 ? "Point" : "Points"} • ${wins} ${Number(wins) === 1 ? "Win" : "Wins"}**
${grouped[key].join(" ")}

`;

    });

            await channel.send({
    content:
`# <:image:1306688519233863711> Weekly Leaderboard Challenge Week Results

Another exciting week has come to an end!

Thank you to everyone who participated and helped make this week a success.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## This Week's Winners

${winners}

Congratulations to this week's winners! 

**Winners, please open a ticket and provide your Incentiv wallet address to claim your prize.**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Everyone Who Scored Points

${everyoneText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A new **Weekly Leaderboard** season has now begun.

**Good luck everyone!**

<@&1337115376949002414>`
});

        }

    } catch (err) {

        console.error("Failed to send leaderboard announcement:", err);

    }

    // ==========================
    // Reset Weekly Season
    // ==========================

    db.prepare(`
        UPDATE users
        SET
            points = 0,
            wins = 0,
            first_point_at = NULL
    `).run();

    // ==========================
    // Save Reset Time
    // ==========================

    db.prepare(`
        UPDATE system_settings
        SET setting_value = ?
        WHERE setting_key = 'last_week_reset'
    `).run(String(mondayUTC));

    console.log("✅ Weekly Leaderboard Reset Completed.");

}

module.exports = checkWeeklyReset;