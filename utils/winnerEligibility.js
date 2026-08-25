const DAY_SECONDS = 24 * 60 * 60;
const PERIOD_WEEKS = 4;
const PERIOD_SECONDS = PERIOD_WEEKS * 7 * DAY_SECONDS;
const WIN_LIMIT = 2;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric"
});

function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}

function startOfUtcDay(epochSeconds) {
    const date = new Date(epochSeconds * 1000);

    return Math.floor(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        0,
        0,
        0
    ) / 1000);
}

function startOfUtcMonday(epochSeconds) {
    const dayStart = startOfUtcDay(epochSeconds);
    const date = new Date(dayStart * 1000);
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;

    return dayStart - (daysSinceMonday * DAY_SECONDS);
}

function formatUtcDate(epochSeconds) {
    if (epochSeconds == null) {
        return "-";
    }

    return dateFormatter.format(new Date(epochSeconds * 1000));
}

function getWinnerRows(db, discordId) {
    return db.prepare(`
        SELECT
            period_start,
            period_end,
            week_start,
            week_end,
            rank,
            discord_id,
            username,
            points,
            wins,
            saved_at
        FROM winner_history
        WHERE discord_id = ?
        ORDER BY period_start DESC, saved_at ASC
    `).all(discordId);
}

function getCurrentRows(rows, referenceSeconds = nowSeconds()) {
    if (rows.length === 0) {
        return [];
    }

    const latest = rows[0];

    if (referenceSeconds >= latest.period_end) {
        return [];
    }

    return rows.filter(row =>
        row.period_start <= referenceSeconds &&
        referenceSeconds < row.period_end
    );
}

function buildState(rows, referenceSeconds = nowSeconds()) {
    const currentRows = getCurrentRows(rows, referenceSeconds);

    if (currentRows.length === 0) {
        return {
            active: false,
            eligible: true,
            count: 0,
            limit: WIN_LIMIT,
            periodStart: null,
            periodEnd: null,
            rows: [],
            winDates: [],
            eligibleAgain: null
        };
    }

    const periodStart = Math.min(...currentRows.map(row => row.period_start));
    const periodEnd = Math.min(...currentRows.map(row => row.period_end));
    const count = currentRows.length;

    return {
        active: true,
        eligible: count < WIN_LIMIT,
        count,
        limit: WIN_LIMIT,
        periodStart,
        periodEnd,
        rows: currentRows,
        winDates: currentRows.map(row => row.period_start).sort((a, b) => a - b),
        eligibleAgain: count >= WIN_LIMIT ? Math.min(...currentRows.map(row => row.period_end)) : null
    };
}

function getWinnerState(db, discordId, referenceSeconds = nowSeconds()) {
    return buildState(getWinnerRows(db, discordId), referenceSeconds);
}

function getWinnerHistorySnapshot(db, discordId, referenceSeconds = nowSeconds()) {
    return getWinnerState(db, discordId, referenceSeconds);
}

function recordWinner(db, winner, winSeconds, referenceSeconds = winSeconds) {
    const state = getWinnerState(db, winner.discordId, referenceSeconds);

    if (state.active && state.count >= WIN_LIMIT) {
        return {
            recorded: false,
            state
        };
    }

    const periodStart = state.active
        ? state.periodStart
        : startOfUtcDay(winSeconds) + DAY_SECONDS - 1;
    const periodEnd = periodStart + PERIOD_SECONDS;
    const winDayStart = startOfUtcDay(winSeconds);
    const winDayEnd = winDayStart + DAY_SECONDS - 1;

    // ponytail: filter top3 saja sebelum insert, bukan insert semua user
    const top3 = db.prepare(`
        SELECT discord_id, username, points, wins
        FROM users
        WHERE points > 0 OR (points = 0 AND wins > 0)
        ORDER BY points DESC, wins DESC
        LIMIT 3
    `).all();

    db.prepare(`
        INSERT OR IGNORE INTO winner_history
        (
            period_start,
            period_end,
            week_start,
            week_end,
            rank,
            discord_id,
            username,
            points,
            wins,
            saved_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        periodStart,
        periodEnd,
        winDayStart,
        winDayEnd,
        winner.rank,
        winner.discordId,
        winner.username,
        winner.points,
        winner.wins,
        referenceSeconds
    );

    return {
        recorded: true,
        state: getWinnerState(db, winner.discordId, referenceSeconds)
    };
}

module.exports = {
    DAY_SECONDS,
    PERIOD_SECONDS,
    WIN_LIMIT,
    formatUtcDate,
    startOfUtcDay,
    startOfUtcMonday,
    getWinnerRows,
    getWinnerState,
    getWinnerHistorySnapshot,
    recordWinner
};
