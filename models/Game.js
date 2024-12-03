const { Sequelize, DataTypes, Model, Op } = require('sequelize')

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

        async checkShouldStartGame() {
            if (this.status != 'new') return

            const gamePlayers = await this.getGamePlayers()
            if (gamePlayers.length >= this.minimumPlayerCount && this.startTime == null) {
                const thisMoment = new Date()
                this.startTime = new Date(+new Date(thisMoment) + (60 * 60 * 1000)) // start in an hour
                await this.save()
                this.notify("🎉 Game has enough players! [The new game](" + this.getUrl() + ") will start in an hour! ⏳ Start conspiring! 🕵️ More people can still `/infight-join` until game time!")
                return
            }

            if (gamePlayers.length < this.minimumPlayerCount && this.startTime != null) {
                this.startTime = null
                await this.save()
                this.notify("⚠️ Game can't start! Player count dipped below **minimum of " + this.minimumPlayerCount + "**. Recruit a player to start the game!")
                return
            }

            console.log('Should Start Game fell through the conditionals')
        }

        async startGame() {

            if (this.status != 'new') {
                throw new Exception("Game isn't new, and can't be started")
            }
            //position the players
            const gamePlayers = await this.getGamePlayers()
            const startingPositions = []
            for (let i = 0; i < gamePlayers.length; i++) {
                var foundClearSpace = false
                while (!foundClearSpace) {
                    foundClearSpace = true

                    const newPos = [
                        Math.floor(Math.random() * this.boardWidth),
                        Math.floor(Math.random() * this.boardHeight)
                    ]
                    if (startingPositions.length == 0) {
                        startingPositions.push(newPos)
                        continue
                    }
                    startingPositions.forEach(existingStartPos => {
                        if (newPos[0] == existingStartPos[0] && newPos[1] == existingStartPos[1]) {
                            foundClearSpace = false
                        }
                    })
                    if (foundClearSpace) {
                        startingPositions.push(newPos)
                    }
                }

            }

            for (let index = 0; index < startingPositions.length; index++) {
                const startingPos = startingPositions[index];
                gamePlayers[index].positionX = startingPos[0]
                gamePlayers[index].positionY = startingPos[1]

                const saveResult = await gamePlayers[index].save()
                console.log('saved starting position', saveResult)
            }
            //set the next AP distro time, change the game status to active
            const thisMoment = new Date()
            const nextTick = new Date(+new Date(thisMoment) + this.minutesPerActionDistro * 60 * 1000)
            this.status = 'active'
            this.startTime = thisMoment
            this.nextTickTime = nextTick

            const gameSaved = await this.save()

            this.notify("🎲 **Game on!** 🎮 The latest [Infight.io game](" + this.getUrl() + ") has started! Band together to 👑 conquer others.  Dare to betray! 🥷")

        }
        getUrl() {
            return process.env.UI_BASE_URL + '/games/' + this.GuildId + '/' + this.id
        }
        notify(msg) {
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

                this.notify("⚡ Infight distributed AP! [Make a move](" + this.getUrl() + ") and watch your back!")
            } catch (error) {
                console.log("game.doTick error", error)
            }

        }

        static async createNewGame(guildId, boardHeight, boardWidth, cycleMinutes) {
            try {
          
              // check if there's an active game
              const guild = await this.sequelize.models.Guild.findByPk(guildId)
              if (guild === null) {
                throw new Exception("Invalid guild")
              }
          
              if (guild.currentGameId) {
                throw new Exception("Already a game in progress")
              }
          
              // check for input size, cycle time, 
              if (!cycleMinutes || cycleMinutes < 1 || cycleMinutes > 9999) {
                throw new Exception("cycleMinutes is not valid")
              }
          
              if (!boardHeight || boardHeight < 5 || boardHeight > 100) {
                throw new Exception("boardHeight is not valid")
              }
          
              if (!boardWidth || boardWidth < 5 || boardWidth > 100) {
                throw new Exception("boardWidth is not valid")
              }
          
              // get all the relevant active players...?
          
              // create the game
              const game = this.build({
                minutesPerActionDistro: cycleMinutes,
                boardWidth: boardWidth,
                boardHeight: boardHeight,
                GuildId: guild.id,
                minimumPlayerCount: guild.minimumPlayerCount
              })
          
              await game.save()
              console.log('created game ' + game.id, game)
          
              //set the current game on the Guild
              guild.currentGameId = game.id
              await guild.save()
          
              //find all opted-in players and add them to the game
              const optedInGuildMembers = await this.sequelize.models.PlayerGuild.findAll({
                where: {
                  GuildId: guild.id,
                  isOptedInToPlay: true
                }
              })
              
              for (let i = 0; i < optedInGuildMembers.length; i++) {
                const gm = optedInGuildMembers[i];
                await game.addPlayer(gm.PlayerId)
              }
          
          
              // send some hype abouut the muster period)
              game.notify("Alright! ♟️ [New Infight Game](" + game.getUrl() + ") created with " + optedInGuildMembers.length + " players!")
          
              //choose about starting in an hour, or waiting for more to join
              if (optedInGuildMembers.length < game.minimumPlayerCount) {
                game.notify("To start [the new game](" + game.getUrl() + "), there need to be at least " + game.minimumPlayerCount + " players. Ask a friend to `/infight-join`!")
              } else {
                game.checkShouldStartGame()
              }
          

              return game
          
            } catch (error) {
              t.rollback()
              throw error
            }
        }

        async doMove() {
            //TODO: move doMove here from app.js
        }
        
        static async startGamesNeedingToStart() {
            let gamesNeedingStarts = await this.findAll({
                where: {
                  startTime: {
                    [Op.lt]: new Date(),
                  },
                  status: 'new'
                },
              })
            
              for (let i = 0; i < gamesNeedingStarts.length; i++) {
                const game = gamesNeedingStarts[i];
                game.startGame()
              }
        }

        static async tickGamesNeedingTick() {
            let gamesNeedingTicks = await this.findAll({
                where: {
                  nextTickTime: {
                    [Op.lt]: new Date(),
                  },
                  status: 'active'
                },
              })
            
              for (let i = 0; i < gamesNeedingTicks.length; i++) {
                const game = gamesNeedingTicks[i];
                game.doTick()
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