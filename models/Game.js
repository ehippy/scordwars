const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {

    class Game extends Model {
        notifier = null

        async addPlayer(playerId) {
            if (this.status != 'new') {
                throw new Exception("Cannot add a player if the game's not new")
            }
            const existingPlayers = await this.sequelize.models.GamePlayer.findAll({
                where: {
                    PlayerId: playerId,
                    GameId: this.id
                },
            })
            if (existingPlayers.length == 1) {
                return existingPlayers[0]
            }

            const gp = this.sequelize.models.GamePlayer.build({
                GameId: this.id,
                PlayerId: playerId
            })
            await gp.save()
            return gp
        }
        async removePlayer(playerId) {
            if (this.status != 'new') {
                throw new Exception("Cannot remove a player if the game's not new")
            }
            const existingPlayer = await this.sequelize.models.GamePlayer.findOne({
                where: {
                    PlayerId: playerId,
                    GameId: this.id
                },
            })
            if (existingPlayer != null) {
                await existingPlayer.destroy()
            }
            return
        }
        startGame() {
            //TODO, move from app.js
        }
        getUrl() {
            return process.env.UI_BASE_URL + '/games/' + this.GuildId + '/' + this.id
        }
        notify(msg){
            this.sequelize.models.Game.notifier.notify(this, msg)
        }
        async doTick() {
            console.log("Starting game tick for " + this.id)

            if (this.status != 'active') {
                throw new Exception("Game is not active")
            }

            const guild = await this.sequelize.models.Guild.findByPk(this.GuildId)
            if (!guild) {
                throw new Exception("Invalid teamId")
            }

            try {
                const thisMoment = new Date()
                const nextTick = new Date(+new Date(thisMoment) + this.minutesPerActionDistro * 60 * 1000)
                this.nextTickTime = nextTick
                const gameSaved = await this.save()

                const [results, metadata] = await this.sequelize.query('UPDATE "GamePlayers" SET actions = actions + 1 WHERE "GameId" = ? AND status = ?', {
                    replacements: [this.id, 'alive']
                })

                this.notify("🚨 Infight gave AP!")
            } catch (error) {
                console.log("game.doTick error", error)
            }

        }

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