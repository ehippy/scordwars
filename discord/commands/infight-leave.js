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

			pg.isOptedInToPlay = false
			await pg.save()

			const guild = await db.Guild.findByPk(interaction.guildId)
			// if there's a pending game, remove them from the roster
			const currentGame = await guild.getCurrentGame()
			if (currentGame != null) {
				await currentGame.removePlayer(pg.PlayerId)
				currentGame.notify("<@" + pg.PlayerId + "> left the roster!")
				currentGame.checkShouldStartGame()
			}

			return interaction.reply("You're off the roster for the next Infight.")
		} catch (error) {
			console.log("Error completing /infight-leave", error)
			return interaction.reply("There was an error removing you from the roster")
		}


	}
};