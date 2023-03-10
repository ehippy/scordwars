const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('infight-join')
		.setDescription('Join the Infight.io game on this Discord'),
	async execute(interaction) {
		const { PlayerGuild } = require('../../data/infightDB');
		const infightDB = require('../../data/infightDB')
		console.log(`join fight from  ${interaction.member.id} `);

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

		pg.isOptedInToPlay = true
		await pg.save()

		return interaction.reply("Bro! You're in!")

	}
};