# scordwars

Server Component for infight.io.

## Configure Local
### Node environment variables
Create a `.env` DOTENV file in the root with the following
```
# Connnection string to a postgres database
POSTGRES_CONN="a postgres db connection string of your making"

# Discord OAuth2 ID and Secret for users to log in. https://discord.com/developers/applications, click OAuth
DISCORD_OAUTH2_CLIENT_ID=""
DISCORD_OAUTH2_CLIENT_SECRET=""

# Discord Owning Guild info
DISCORD_CLIENT_ID="" # the Discord Application Id
DISCORD_GUILD_ID="" # the owning Discord Guild Id
DISCORD_BOT_TOKEN=""

# Some big, long secret string to hash session tokens with
SESSION_SECRET=""

# The base url of the UI site
UI_BASE_URL="http://localhost:5173"
```


## deploy commands
The files in /discord/commands are "slash commands" users use to join and depart games. We need to run deployCommands.js to configure those with Discord. There's a VSCode configuration to run these included as, "Deploy Slash Commands to Discord".

## To run and debug
Use VSCode, run `Debug Infight` from the debug panel.