let dotEnvPath = `.env.${process.env.NODE_ENV}`;
if (process.env.NODE_ENV === 'development') {
	dotEnvPath = '.env';

}
require('dotenv').config({ path: dotEnvPath })

console.log(`Starting deployCommands.js with ${dotEnvPath} environment`)

const clientId = process.env.DISCORD_CLIENT_ID;
const token = process.env.DISCORD_BOT_TOKEN;

const guildId = process.env.DISCORD_GUILD_ID;

const { REST, Routes } = require('discord.js');
const fs = require('node:fs');

const commands = [];
// Grab all the command files from the commands directory you created earlier
const commandFiles = fs.readdirSync('./discord/commands').filter(file => file.endsWith('.js'));

// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationCommands(clientId), //register globally
			//Routes.applicationGuildCommands(clientId, guildId), // register just on Guild, good for DEV testing
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();