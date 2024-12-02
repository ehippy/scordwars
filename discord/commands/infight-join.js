const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('infight-join')
		.setDescription('Join the Infight.io game on this Discord'),
	async execute(interaction) {
		try {

			const db = require('../../models/infightDB')
			console.log(`join fight from  ${interaction.member.id} `);

			// confirm the player exists
			const player = await db.Player.findByPk(interaction.member.id)
			if (player == null) {
				return interaction.reply("You haven't signed up at http://infight.io yet!")
			}

			// confirm the player's been attached to a guild
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

			pg.isOptedInToPlay = true
			await pg.save()

			// if there's a pending game, add them as a player
			const guild = await db.Guild.findByPk(interaction.guildId)
			const currentGame = await guild.getCurrentGame()
			if (null != currentGame) {
				await currentGame.addPlayer(pg.PlayerId)
			}
			
			return interaction.reply("You are on the roster for the next game!")

		} catch (error) {
			console.log("Error completing /infight-join", error)
			return interaction.reply("There was an error adding you to the roster")
		}

	}
};