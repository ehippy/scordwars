const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {

    // add instance and class methods in here
    class Guild extends Model {
        async getCurrentGame() {
            if (this.currentGameId == null) return null
            return await this.sequelize.models.Game.findByPk(this.currentGameId)
        }

        async shouldStartCurrentGame() {
            let currentGame = await this.getCurrentGame()
            if (currentGame != null && currentGame.status == 'new') {
                currentGame.boardWidth = this.boardSize
                currentGame.boardHeight = this.boardSize
                currentGame.minutesPerActionDistro = this.actionTimerMinutes
                currentGame.minimumPlayerCount = this.minimumPlayerCount
                await currentGame.save()
                currentGame.checkShouldStartGame()
            }
        }
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
                defaultValue: 5
            },
            boardSize: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 8
            },
            actionTimerMinutes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 60
            },
            stats: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: {}
            }
        },
        { sequelize }
    )

    return Guild

}