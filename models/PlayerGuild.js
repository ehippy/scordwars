const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {
    const Guild = sequelize.models.Guild
    const Player = sequelize.models.Player

    // add instance and class methods in here
    class PlayerGuild extends Model {

        async changePlayerOptIn(OptIn) {
            const db = this.sequelize
            this.isOptedInToPlay = OptIn
            await this.save()

            // if there's a pending game, add them as a player
            const guild = await db.models.Guild.findByPk(this.GuildId)
            const currentGame = await guild.getCurrentGame()

            if (currentGame && currentGame.status == 'new') {
                if (OptIn) {
                    await currentGame.addPlayer(pg.PlayerId)
                    currentGame.notify("<@" + pg.PlayerId + "> joined in time! 💪")
                    currentGame.checkShouldStartGame()
                } else {
                    await currentGame.removePlayer(pg.PlayerId)
                    currentGame.notify("<@" + pg.PlayerId + "> backed out! 😩")
                    currentGame.checkShouldStartGame()
                }
            }
        }
    }

    // set up the Sequelize fields
    PlayerGuild.init(
        {
            GuildId: {
                type: DataTypes.STRING,
                references: {
                    model: Guild,
                    key: 'id'
                }
            },
            PlayerId: {
                type: DataTypes.STRING,
                references: {
                    model: Player,
                    key: 'id'
                }
            },
            isAdmin: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            isOptedInToPlay: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            }
        },
        { sequelize }
    )

    return PlayerGuild

}