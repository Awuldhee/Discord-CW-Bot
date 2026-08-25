# Discord CW Bot

Discord bot for managing **CW Points**, weekly leaderboards, event points, winner history, and automated SQLite database backups to Google Drive.

## Features

- **CW Points Management** — moderators can add or remove points.
- **Weekly Leaderboard** — displays the current Top 10 leaderboard.
- **Member Points** — members can check their points and weekly rank.
- **Weekly History** — view previous weekly leaderboard results.
- **Winner History** — track previous Top 3 results.
- **Event Points** — award points for weekly and mini events.
- **Weekly Rules** — show leaderboard rules directly in Discord.
- **Weekly Announcement** — publish weekly leaderboard announcements.
- **SQLite Database** — local persistent storage using `better-sqlite3`.
- **Google Drive Backup** — scheduled and database-change backups.
- **Docker Support** — Dockerfile and Compose configuration included.
- **PM2 Support** — production process configuration included.

---

## Requirements

### Required

Before running the bot, install:

1. **Node.js 22 or newer**
2. **npm** — included with Node.js
3. A **Discord Application / Bot** created in the Discord Developer Portal
4. A Discord server where the bot will be installed

You do **not** need to install SQLite separately. The project uses `better-sqlite3`, which is installed by npm.

### Optional: Google Drive Backup

The provided project starts the backup scheduler by default, so configure Google Drive if you want the included backup system to work:

- A Google Cloud Project
- Google Drive API enabled
- An OAuth 2.0 Client ID for a Desktop application
- A Google Drive folder where the bot can store `database_latest.db`

Google Drive credentials are **not included** in this repository for security reasons.

### Optional: Production Tools

- **Docker** — only required if you want to deploy with Docker.
- **PM2** — only required if you want to run the bot with PM2.

---

## NPM Dependencies

You normally do **not** need to install these packages one by one. Running `npm install` installs everything listed in `package.json`.

Main dependencies:

- `discord.js` — Discord bot framework
- `better-sqlite3` — SQLite database
- `canvas` — Canvas/image rendering support
- `@napi-rs/canvas` — native canvas support
- `dotenv` — loads `.env` configuration
- `googleapis` — Google APIs / Google Drive integration
- `google-auth-library` — Google authentication
- `@google-cloud/local-auth` — local OAuth authorization flow for Google Drive

Development dependency:

- `nodemon` — optional development auto-restart tool

---

## Installation

### 1. Install Node.js

Install **Node.js 22+** on the computer/server that will run the bot.

Check the installation:

```bash
node -v
npm -v
```

### 2. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/discord-cw-bot.git
cd discord-cw-bot
```

### 3. Install project dependencies

```bash
npm install
```

This automatically installs all required npm packages, including the Google authentication package used by `backup/authorize.js`.

### 4. Create the environment file

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux/macOS:

```bash
cp .env.example .env
```

Then edit `.env` and enter your own values.

---

## Discord Bot Setup

1. Create an application in the **Discord Developer Portal**.
2. Create a Bot under the application.
3. Copy the bot token into `.env` as `TOKEN`.
4. Copy the Application/Client ID into `config.json`.
5. Copy your Discord server ID into `config.json`.
6. Copy the moderator role ID into `config.json`.
7. Copy the required channel IDs into `config.json`.
8. Invite the bot to your server with the required bot and application-command permissions.

Example `config.json`:

```json
{
  "clientId": "YOUR_CLIENT_ID",
  "guildIds": "YOUR_GUILD_ID",
  "moderatorRole": "YOUR_MODERATOR_ROLE_ID",
  "botCommandsChannel": "YOUR_BOT_COMMANDS_CHANNEL_ID",
  "leaderboardChannel": "YOUR_LEADERBOARD_CHANNEL_ID"
}
```

---

## Google Drive Backup Setup

The Google Drive backup uses **Google Drive API + OAuth 2.0**. You do not need to install a separate Google Drive application on the server.

### 1. Create a Google Cloud Project

Create or select a project in Google Cloud Console.

### 2. Enable Google Drive API

Open **APIs & Services → Library**, search for **Google Drive API**, and enable it.

### 3. Configure OAuth consent

Configure the OAuth consent screen as required by your Google account/project. Add the account that will authorize the bot as a test user if Google requires it.

### 4. Create OAuth credentials

Create an **OAuth Client ID** using a **Desktop application** type.

Download the client secret JSON file and rename/place it here:

```text
credentials/client_secret.json
```

**Do not upload this file to GitHub.**

### 5. Create a Google Drive backup folder

Create a folder in Google Drive and copy its folder ID from the folder URL.

Put the ID in `.env`:

```env
GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
```

### 6. Authorize the bot

Run:

```bash
node backup/authorize.js
```

A browser window may open for Google authorization. After successful authorization, the bot creates:

```text
credentials/token.json
```

This file is private and must never be uploaded to GitHub.

### 7. Configure backup timing

Example:

```env
BACKUP_INTERVAL=30
BACKUP_DEBOUNCE=60
```

- `BACKUP_INTERVAL=30` → scheduled backup every 30 minutes.
- `BACKUP_DEBOUNCE=60` → waits 60 seconds after a database change before running a backup.

---

## Environment Variables

Example `.env`:

```env
TOKEN=your_discord_bot_token

GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id
GOOGLE_CLIENT_SECRET=credentials/client_secret.json
GOOGLE_TOKEN=credentials/token.json

BACKUP_INTERVAL=30
BACKUP_DEBOUNCE=60
```

**Never commit `.env` to GitHub.**

---

## Register Slash Commands

After configuring Discord, register the slash commands:

```bash
npm run deploy:commands
```

If successful, the commands will be registered to the guild IDs configured in `config.json`.

---

## Run the Bot

Start normally:

```bash
npm start
```

The bot will load commands/events, initialize the SQLite database, and start the backup scheduler.

---

## Development

For automatic restart while editing files:

```bash
npx nodemon index.js
```

`nodemon` is already included as a development dependency.

---

## Docker

Docker is optional.

The included Dockerfile installs the native packages required by the canvas dependency and runs the bot with Node.js 22.

Build and start:

```bash
docker compose up -d --build
```

View logs:

```bash
docker compose logs -f
```

Stop:

```bash
docker compose down
```

For Google Drive backup, make sure `credentials/client_secret.json` and `credentials/token.json` exist on the host before starting the container.

---

## PM2

PM2 is optional and useful for keeping the bot running on a Linux server.

Install PM2 globally:

```bash
npm install -g pm2
```

Start the bot:

```bash
pm2 start ecosystem-config.js
```

Save the process list:

```bash
pm2 save
```

View status:

```bash
pm2 status
```

View logs:

```bash
pm2 logs discord-cw-bot
```

---

## Commands

| Command | Description |
|---|---|
| `/give_event` | Give weekly points to a member for an event |
| `/give_mini_event` | Give points for a mini event |
| `/remove_cw` | Remove CW Points from a member |
| `/my_points` | View current CW Points and weekly rank |
| `/top_cw` | View the current weekly Top 10 leaderboard |
| `/history` | View previous weekly leaderboard |
| `/winner_history` | View a member's winner history |
| `/wins` | Manage weekly wins |
| `/rules` | View weekly leaderboard rules |
| `/send_weekly_announcement` | Send the weekly leaderboard announcement |

Some commands are restricted to moderators or specific Discord channels.

---

## Project Structure

```text
discord-cw-bot/
├── backup/                  # Google Drive and database backup system
├── backup_files/            # Temporary backup files (ignored)
├── commands/                # Discord slash commands
├── credentials/             # Private Google credentials (ignored)
├── database/                # SQLite database logic
├── events/                  # Discord events
├── utils/                   # Leaderboard and weekly utilities
├── .dockerignore
├── .env.example             # Safe environment-variable template
├── .gitignore
├── Dockerfile
├── compose.yml
├── config.json
├── deploy-commands.js
├── ecosystem-config.js
├── index.js
├── package.json
└── restore_weekly.js
```

---

## Security

Never upload these files or folders containing secrets:

```text
.env
credentials/*.json
database/*.db
database/*.db-shm
database/*.db-wal
```

The repository includes a `.gitignore` configured to keep these files out of Git.

If a Discord token, Google OAuth credential, or other secret is accidentally exposed, revoke/rotate it immediately.

---

## Quick Start

For a normal installation:

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/discord-cw-bot.git
cd discord-cw-bot

# 2. Install dependencies
npm install

# 3. Create .env and edit config.json

# 4. Complete Google OAuth setup if backup is enabled
node backup/authorize.js

# 5. Register slash commands
npm run deploy:commands

# 6. Start bot
npm start
```

After the first Google authorization, `credentials/token.json` is stored locally and reused for future backups.
