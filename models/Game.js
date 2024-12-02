const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {

    class Game extends Model {
        
    }

    // set up the Sequelize fields
    Game.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                allowNull: false,
                primaryKey: true
            },
            status: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'new'
            },
            musterTime: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            },
            startTime: {
                type: DataTypes.DATE,
                allowNull: true
            },
            nextTickTime: {
                type: DataTypes.DATE,
                allowNull: true
            },
            minutesPerActionDistro: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 60 * 12
            },
            boardWidth: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 20
            },
            boardHeight: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 20
            },
            winningPlayer: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            minimumPlayerCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 2
            }, 
            boardHeartLocations: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: []
            }
        },
        { sequelize }
    )

    return Game

}