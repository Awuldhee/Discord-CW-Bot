const db = require('./database/database.js');

const weekStart = 1786320000; // Aug 10 00:00 UTC
const weekEnd = 1787184000;   // Aug 17 00:00 UTC

const weekly = db.prepare(`
  SELECT 
    discord_id,
    username,
    SUM(points) as total_points,
    COUNT(*) as total_wins,
    MIN(created_at) as first_point_at
  FROM mini_event_history 
  WHERE created_at >= ? AND created_at < ?
  GROUP BY discord_id
`).all(weekStart, weekEnd);

console.log('Weekly users to restore:', weekly.length);

const updateStmt = db.prepare(`
  UPDATE users 
  SET points = ?, wins = ?, first_point_at = ?
  WHERE discord_id = ?
`);
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO users (discord_id, username, points, wins, first_point_at)
  VALUES (?, ?, ?, ?, ?)
`);

let count = 0;
for (const u of weekly) {
  const existing = db.prepare('SELECT points FROM users WHERE discord_id = ?').get(u.discord_id);
  if (existing) {
    updateStmt.run(u.total_points, u.total_wins, u.first_point_at, u.discord_id);
  } else {
    insertStmt.run(u.discord_id, u.username, u.total_points, u.total_wins, u.first_point_at);
  }
  count++;
}

console.log('Restored', count, 'users from mini_event_history');

const restored = db.prepare('SELECT username, points, wins, datetime(first_point_at, "unixepoch") as fp FROM users WHERE points > 0 ORDER BY points DESC, wins DESC, first_point_at ASC LIMIT 10').all();
restored.forEach(r => console.log(r.username, 'pts='+r.points, 'wins='+r.wins, 'first='+r.fp));
