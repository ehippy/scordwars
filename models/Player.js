const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {

    class Player extends Model {
        
    }

    // set up the Sequelize fields
    Player.init(
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
            discriminator: {
                type: DataTypes.STRING,
                allowNull: false
            },
            avatar: {
                type: DataTypes.STRING
            },
            stats: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: {}
            }
        },
        { sequelize }
    )

    return Player

}