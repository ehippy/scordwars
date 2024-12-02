const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {

    // add instance and class methods in here
    class Guild extends Model {

    }

    // set up the Sequelize fields
    Guild.init(
        {
            id: {
                type: DataTypes.STRING,
                allowNull: false,
                primaryKey: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            icon: {
                type: DataTypes.STRING
            },
            isConnected: {
                type: DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: false
            },
            gameChannelId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            currentGameId: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            minimumPlayerCount: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 6
            }
        },
        { sequelize }
    )

    return Guild

}