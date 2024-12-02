const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('infight-leave')
		.setDescription('Leave the Infight.io game on this Discord'),
	async execute(interaction) {
		const { infightDB, PlayerGuild, Guild, Game, GamePlayer } = require('../../models/infightDB')
		console.log(`leave fight from  ${interaction.member.id} `);

		const player = await infightDB.Player.findByPk(interaction.member.id)
		if (player == null) {
			return interaction.reply("You haven't signed up at http://infight.io yet!")
		}

		const pg = await infightDB.PlayerGuild.findOne({
			where: {
				GuildId: interaction.guildId,
				PlayerId: interaction.member.id
			}
		})

		if (pg == null) {
			pg = PlayerGuild.build({
				GuildId: interaction.guildId,
				PlayerId: interaction.member.id
			})
		}

		pg.isOptedInToPlay = false
		await pg.save()

		const guild = await infightDB.Guild.findByPk(interaction.guildId)
		// if there's a pending game, remove them from the roster

		if (guild.currentGameId) {
			const game = await infightDB.Guild.findByPk(guild.currentGameId)

			//TODO: how refactor all the game methods into some reusable spot
		}

		return interaction.reply("You're off the roster for the next Infight.")

	}
};