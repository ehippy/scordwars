const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {

    class GamePlayer extends Model {
        
    }

    // set up the Sequelize fields
    GamePlayer.init(
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
                defaultValue: 'alive'
            },
            health: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 3
            },
            actions: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            range: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1
            },
            positionX: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            positionY: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            deathTime: {
                type: DataTypes.DATE,
                allowNull: true
            },
            winPosition: {
                type: DataTypes.INTEGER,
                allowNull: true
            }
        },
        { sequelize }
    )

    return GamePlayer

}