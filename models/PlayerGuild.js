const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {
    const Guild = sequelize.models.Guild
    const Player = sequelize.models.Player

    // add instance and class methods in here
    class PlayerGuild extends Model {

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