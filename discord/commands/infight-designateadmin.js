const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('infight-designateadmin')
		.setDescription('Sets or unsets a discord user as an Infight admin')
        .addUserOption(option => option.setName('user').setDescription('The user to designate as an admin'))
        .addBooleanOption(option => option.setName('set-as-admin').setDescription('True/False shoud user be an admin')),
	async execute(interaction, db) {
		try {
			console.log(`set admin from  ${interaction.member.id} `);

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
				return interaction.reply("You're not a member of this server. Use /infight-join to join the server")
			}

            //get user selected
            const userToSetAdminFor = interaction.options.getUser('user')
            const shouldBeAdmin = interaction.options.getBoolean('set-as-admin')

			// confirm the player exists
			const playerGuildToSetAdminOn = await db.PlayerGuild.findOne({
				where: {
					GuildId: interaction.guildId,
					PlayerId: userToSetAdminFor.id
				}
			})

            if (playerGuildToSetAdminOn == null) {
                return interaction.reply("That user isn't a member of this server. Have them join first.")
            }
            playerGuildToSetAdminOn.isAdmin = shouldBeAdmin
            await playerGuildToSetAdminOn.save()


			return interaction.reply("Administrator set!", { ephemeral: true })

		} catch (error) {
			console.log("Error completing /infight-join", error)
			return interaction.reply("There was an error setting the administrator", { ephemeral: true })
		}

	}
};