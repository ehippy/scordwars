const { SlashCommandBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('infight-leave')
		.setDescription('Leave the Infight.io game on this Discord'),
	async execute(interaction) {

		const { PlayerGuild } = require('../../data/infightDB');
		const infightDB = require('../../data/infightDB')

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

		// if there's a pending game, remove them from the roster

		return interaction.reply("You're off the roster for the next Infight.")

	}
};