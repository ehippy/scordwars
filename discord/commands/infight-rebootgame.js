const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infight-rebootgame')
        .setDescription('Forcefully end the current game and start a new one')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ,

    async execute(interaction, db) {
        try {
            console.log(`discord setting request from  ${interaction.member.id} `, interaction);

            // confirm the player's been attached to a guild
            const guild = await db.Guild.findByPk(interaction.guildId)
            if (guild == null) {
                return interaction.reply("That server wasn't found")
            }
            
            let game = await guild.getCurrentGame()
            if (game != null) {
                await game.cancelAndStartNewGame()
                return interaction.reply("Admin used`/infight-rebootgame` to start a new game")
            } else {
                guild.currentGameId = null
                await guild.save()
            }
            db.Game.createNewGame(guild.id)

            return interaction.reply("Admin used`/infight-rebootgame` to start a new game")

        } catch (error) {
            console.log("Error completing /infight-rebootgame", error)
            return interaction.reply("There was an error with infight-rebootgame")
        }

    }
};