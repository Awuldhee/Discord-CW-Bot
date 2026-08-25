const config = require("../config.json");
const { PERIOD_SECONDS, DAY_SECONDS, startOfUtcMonday } = require("./winnerEligibility");

async function sendWeeklyAnnouncement(client) {

    const db = client.db;

    // ─── Weekly snapshot + reset ───────────────────────────────────
        // Snapshot current week before reset (data preservation)
        const nowUTC = Math.floor(Date.now() / 1000);

        // Guard: only process once per week (Monday 00:00 UTC boundary)
        const lastResetRow = db.prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'last_week_reset'").get();
        const lastReset = lastResetRow ? parseInt(lastResetRow.setting_value) : 0;

        // Current Monday 00:00 UTC
        const mondayStart = startOfUtcMonday(nowUTC);
        if (lastReset >= mondayStart) {
          return false; // sudah pernah reset minggu ini
        }

        // Snapshot the week that just ended: previous Monday to this Monday
        const prevMonday = mondayStart - 604800; // previous Monday 00:00 UTC
        const weekEnd = mondayStart - 1; // end of week (Sunday 23:59:59)

        // Snapshot into leaderboard_history
        db.prepare(`
          INSERT INTO leaderboard_history (week_start, week_end, rank, discord_id, username, points, wins, saved_at)
          SELECT ?, ?, ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, first_point_at ASC),
                 discord_id, username, points, wins, ?
          FROM users WHERE points > 0
        `).run(prevMonday, weekEnd, nowUTC);

        // Snapshot winners (top 3)
        const periodStart = weekEnd; // Sunday of the winning week (23:59:59 UTC)
        const periodEnd = periodStart + PERIOD_SECONDS;
        db.prepare(`
          INSERT INTO winner_history (period_start, period_end, week_start, week_end, rank, discord_id, username, points, wins, saved_at)
          SELECT ?, ?, ?, ?, ROW_NUMBER() OVER (ORDER BY points DESC, wins DESC, first_point_at ASC),
                 discord_id, username, points, wins, ?
          FROM users WHERE points > 0 ORDER BY points DESC, wins DESC, first_point_at ASC LIMIT 3
        `).run(periodStart, periodEnd, prevMonday, weekEnd, nowUTC);

        // Reset weekly points
        db.prepare("UPDATE users SET points = 0, wins = 0, first_point_at = NULL WHERE points > 0 OR wins > 0 OR first_point_at IS NOT NULL").run();
        // ponytail: weekly reset — snapshot saved first; if bot offline at reset, next run will snapshot accumulated points
        db.prepare("INSERT OR REPLACE INTO system_settings (setting_key, setting_value) VALUES ('last_week_reset', ?)").run(mondayStart.toString());

    // ─── Post-reset leaderboard query uses first_point_at (now reset) ──
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

    if (leaderboard.length === 0) {
    return false;
}

    const channel = await client.channels.fetch(config.leaderboardChannel);

    if (!channel) {
    return false;
}

    // ==========================
    // Rewards
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

    return true;

}


module.exports = sendWeeklyAnnouncement;