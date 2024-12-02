const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {

    class Move extends Model {
        
    }

    // set up the Sequelize fields
    Move.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                allowNull: false,
                primaryKey: true
            },
            action: {
                type: DataTypes.STRING,
                allowNull: false
            },
            targetPositionX: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            targetPositionY: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
        },
        { sequelize }
    )

    return Move

}