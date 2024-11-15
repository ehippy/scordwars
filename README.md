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

# Discord Application settings
DISCORD_CLIENT_ID=""
DISCORD_GUILD_ID=""
DISCORD_BOT_TOKEN=""

# Some big, long secret string to hash session tokens with
SESSION_SECRET=""
```


## deploy commands
Make a `discord/deployConfig.json` file with the right values in it: 
```
{
	"token": "",
	"clientId": "",
	"guildId": ""
}
```
## To run and debug
Use VSCode, run `Debug Infight` from the debug panel.