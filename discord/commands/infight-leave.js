const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('infight-leave')
		.setDescription('Leave the Infight.io game on this Discord'),
	async execute(interaction, gameEventChannels) {
		try {
			const db = require('../../models/infightDB')
			console.log(`leave fight from  ${interaction.member.id} `);

			const player = await db.Player.findByPk(interaction.member.id)
			if (player == null) {
				return interaction.reply("You haven't signed up at http://infight.io yet!")
			}

			const pg = await db.PlayerGuild.findOne({
				where: {
					GuildId: interaction.guildId,
					PlayerId: interaction.member.id
				}
			})

			if (pg == null) {
				pg = db.PlayerGuild.build({
					GuildId: interaction.guildId,
					PlayerId: interaction.member.id
				})
			}

			if (pg != null) {
				pg.changePlayerOptIn(true)
			}

			return interaction.reply("You're off the roster for the next Infight.", { ephemeral: true })
		} catch (error) {
			console.log("Error completing /infight-leave", error)
			return interaction.reply("There was an error removing you from the roster", { ephemeral: true })
		}


	}
};