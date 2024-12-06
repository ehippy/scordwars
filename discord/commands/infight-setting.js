const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infight-setting')
        .setDescription('Review and change your Infight.io settings')
        .addIntegerOption(option => option.setName('set-action-timer-minutes').setDescription('The number of minutes between Action Points, between 15 and 2880'))
        .addIntegerOption(option => option.setName('set-board-size').setDescription('The width and height of the board, 0 for auto'))
        .addIntegerOption(option => option.setName('set-min-players').setDescription('The minimum number of players to start a game between 2 and 50'))
        .addChannelOption(option =>
            option.setName('set-channel')
                .setDescription('Select the channel Infight posts to')
                .addChannelTypes(ChannelType.GuildText))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ,

    async execute(interaction) {
        try {

            const db = require('../../models/infightDB')
            console.log(`discord setting request from  ${interaction.member.id} `, interaction);

            // confirm the player exists
            const player = await db.Player.findByPk(interaction.member.id)
            if (player == null) {
                return interaction.reply("You haven't signed up at http://infight.io yet!")
            }

            // confirm the player's been attached to a guild
            const guild = await db.Guild.findByPk(interaction.guildId)
            if (guild == null) {
                return interaction.reply("That server wasn't found")
            }

            let settingChanged = false
            const actionTimerMinutes = interaction.options.getInteger('set-action-timer-minutes')
            if (actionTimerMinutes != null) {
                if (actionTimerMinutes < 30 || actionTimerMinutes > 2880) {
                    return interaction.reply("ActionTimerMinutes must be between 30 and 2880")
                }
                settingChanged = true
                guild.actionTimerMinutes = actionTimerMinutes
            }

            const boardSize = interaction.options.getInteger('set-board-size')
            if (boardSize != null) {
                if (boardSize < 0 || boardSize > 30) {
                    return interaction.reply("BoardSize must be between 0 and 30")
                }
                settingChanged = true
                guild.boardSize = boardSize
            }

            const minPlayers = interaction.options.getInteger('set-min-players')
            if (minPlayers != null) {
                if (minPlayers < 2 || minPlayers > 50) {
                    return interaction.reply("MinPlayers must be between 2 and 50")
                }
                settingChanged = true
                guild.minimumPlayerCount = minPlayers
            }

            let newChannel = interaction.options.getChannel('set-channel')
            if (newChannel != null) {
                settingChanged = true
                guild.gameChannelId = newChannel.id
            }

            if (settingChanged) {
                await guild.save()
                return interaction.reply("Setting updated!")
            }

            const manPage = `**Infight.io Settings for ${guild.name}**

- \`Action Timer Minutes\`: **${guild.actionTimerMinutes}**
- \`Board Size\`: **${guild.boardSize}**
- \`Minimum Players\`: **${guild.minimumPlayerCount}**

Use the /infight-setting options to change these. These only affect future games.`
            return interaction.reply(manPage)

        } catch (error) {
            console.log("Error completing /infight-setting", error)
            return interaction.reply("There was an error with infight-setting")
        }

    }
};