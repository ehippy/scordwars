const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infight-rebootgame')
        .setDescription('Forcefully end the current game and start a new one')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ,

    async execute(interaction) {
        try {

            const db = require('../../models/infightDB')
            console.log(`discord setting request from  ${interaction.member.id} `, interaction);

            // confirm the player's been attached to a guild
            const guild = await db.Guild.findByPk(interaction.guildId)
            if (guild == null) {
                return interaction.reply("That server wasn't found")
            }
            
            let game = await guild.getCurrentGame()
            if (game != null) {
                await game.cancelAndStartNewGame()
                return interaction.reply("Game cancelled and new game started")
            }
            db.models.Game.createNewGame(guild.id)

            return interaction.reply("New game started")

        } catch (error) {
            console.log("Error completing /infight-rebootgame", error)
            return interaction.reply("There was an error with infight-rebootgame")
        }

    }
};