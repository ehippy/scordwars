const { Sequelize, DataTypes, Model, Op } = require('sequelize')
const { Stats } =  require('./StatTracker')
const GamePlayer = require('./GamePlayer')

module.exports = function (sequelize) {

    class Game extends Model {
        notifier = null

        async addPlayer(playerId) {
            if (this.status != 'new') {
                throw new Error("Cannot add a player if the game's not new")
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
                throw new Error("Cannot remove a player if the game's not new")
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
                this.startTime = new Date(+new Date(thisMoment) + (5 * 60 * 1000)) // start in an hour
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

        async #findClearSpace(gamePlayers) {
            let loopCount = 0
            let foundClearSpace = false
            while (!foundClearSpace) {
                loopCount++
                foundClearSpace = true

                const newPos = [
                    Math.floor(Math.random() * this.boardWidth),
                    Math.floor(Math.random() * this.boardHeight)
                ]

                //did we crash into a player?
                for (let i = 0; i < gamePlayers.length; i++) {
                    const gp = gamePlayers[i];
                    if (gp.positionX == newPos[0] && gp.positionY == newPos[1]) {
                        foundClearSpace = false
                    }
                }

                //did we crash into a heart
                for (let i = 0; i < this.boardHeartLocations.length; i++) {
                    const hl = this.boardHeartLocations[i];
                    if (hl[0] == newPos[0] && hl[1] == newPos[1]) {
                        foundClearSpace = false
                    }
                }

                if (foundClearSpace) {
                    return newPos
                }

                if (loopCount > 10000) {
                    throw new Error("findClearSpace ran too long")
                }
            }
        }

        async startGame() {

            if (this.status != 'new') {
                throw new Error("Game isn't new, and can't be started")
            }

            const guild = await this.sequelize.models.Guild.findByPk(this.GuildId)
            if (!guild) {
                throw new Error("Invalid teamId")
            }

            //position the players
            const gamePlayers = await this.getGamePlayers()
            const userRequestedBoardSize = guild.boardSize

            if (userRequestedBoardSize ** 2 < gamePlayers.length) { // if the board is too small, auto-size it
                const autoBoardSize = this.sequelize.models.Game.calculateBoardSize(gamePlayers.length, 0.1)
                this.boardHeight = autoBoardSize
                this.boardWidth = autoBoardSize
            } else {
                this.boardHeight = userRequestedBoardSize
                this.boardWidth = userRequestedBoardSize
            }
            this.minutesPerActionDistro = guild.actionTimerMinutes

            for (let index = 0; index < gamePlayers.length; index++) {
                const startingPos = await this.#findClearSpace(gamePlayers);
                gamePlayers[index].positionX = startingPos[0]
                gamePlayers[index].positionY = startingPos[1]

                const saveResult = await gamePlayers[index].save()
                //console.log('saved starting position', saveResult)
            }
            //set the next AP distro time, change the game status to active
            const thisMoment = new Date()
            const nextTick = new Date(+new Date(thisMoment) + this.minutesPerActionDistro * 60 * 1000)
            this.status = 'active'
            this.startTime = thisMoment
            this.nextTickTime = nextTick

            const gameSaved = await this.save()

            this.notify("## 🎲 **Game on!** 🎮 The latest [Infight.io game](" + this.getUrl() + ") has started! Band together to 👑 conquer others! Be the last.")

        }
        getUrl() {
            return process.env.UI_BASE_URL + '/games/' + this.GuildId + '/' + this.id
        }
        notify(msg) {
            this.sequelize.models.Game.notifier.notify(this, msg)
        }
        async doTick() {

            if (this.status != 'active') {
                throw new Error("Game is not active")
            }

            const guild = await this.sequelize.models.Guild.findByPk(this.GuildId)
            if (!guild) {
                throw new Error("Invalid teamId")
            }

            try {
                const thisMoment = new Date()
                const nextTick = new Date(+new Date(thisMoment) + this.minutesPerActionDistro * 60 * 1000)
                this.nextTickTime = nextTick
                const gameSaved = await this.save()

                //do jury vote count
                let votedGamePlayer = await this.sequelize.models.GamePlayer.findOne({
                    where: {
                        GameId: this.id,
                        juryVotesAgainst: {
                            [Op.gt]: 0
                        }
                    },
                    order: [
                        ['juryVotesAgainst', 'DESC']
                    ]
                })

                if (votedGamePlayer) {
                    const tastyTreats = ["🍩", "🍪", "🍫", "🍿", "🍨", "🍦", "🍭", "🍬", "🥧", "🧁", "🎂", "🍰"];
                    const randomTreat = tastyTreats[Math.floor(Math.random() * tastyTreats.length)];

                    this.notify(randomTreat + " **The dead have spoken!** <@" + votedGamePlayer.PlayerId + "> got an EXTRA AP treat! " + randomTreat)

                    await this.sequelize.query('UPDATE "GamePlayers" SET actions = actions + 1 WHERE id = ?', {
                        replacements: [votedGamePlayer.id,]
                    })
                    Stats.increment(votedGamePlayer, Stats.GamePlayerStats.treated)
                }

                await this.giveAllLivingPlayersAP(1)

                await this.sequelize.query('UPDATE "GamePlayers" SET "juryVotesAgainst" = 0 WHERE "GameId" = ?', {
                    replacements: [this.id]
                })

                await this.sequelize.query('UPDATE "GamePlayers" SET "juryVotesToSpend" = 1 WHERE "GameId" = ? AND status = ?', {
                    replacements: [this.id, 'dead']
                })

                let heartMsg = ''
                const heartChance = 0.25
                if (Math.random() > heartChance) {
                    await this.addHeart()
                    heartMsg = " A heart appeared! 💗 Is it nearby?"
                }

                if (this.suddenDeathRound == 0) {
                    this.notify("⚡ Infight distributed AP! [Make a move](" + this.getUrl() + ") and watch your back!" + heartMsg)
                }

                if (this.suddenDeathRound > 0) {
                    const edgeDistance = this.suddenDeathRound; // Define the distance from the edge you want to check

                    await this.giveAllLivingPlayersAP(2)
                    this.notify("🌪️ **The storm** is closing in! You draw an extra AP from its power! 🌪️")

                    let playersHitByStorm = []
                    let playersKilledByStorm = []
                    const players = await this.getGamePlayers();
                    const livingPlayers = this.constructor.getLivingPlayers(players)
                    const countAliveBeforeBlasts = livingPlayers.length;
                    for (let i = 0; i < livingPlayers.length; i++) {
                        const player = livingPlayers[i];
                        const { positionX, positionY } = player;

                        if (
                            positionX + 1 <= edgeDistance || // Left edge
                            positionX >= this.boardWidth - (edgeDistance + 1) || // Right edge
                            positionY + 1 <= edgeDistance || // Top edge
                            positionY >= this.boardHeight - (edgeDistance + 1) // Bottom edge
                        ) {
                            console.log(`Player ${player.PlayerId} is within ${edgeDistance} units from the edge.`);
                            playersHitByStorm.push(player);
                            player.health -= 1;
                            Stats.increment(player, Stats.GamePlayerStats.zapped)

                            if (player.health === 0) {
                                player.status = 'dead';
                                player.deathTime = new Date();
                                playersKilledByStorm.push(player);
                                this.notify(`🌪️ **The storm** shocked and killed <@${player.PlayerId}>! They're out!`);
                            } else {
                                this.notify(`🌪️ **The storm** shocked <@${player.PlayerId}> for 1 HP! Run to the center!`);
                            }
                            await player.save();
                        }
                    }

                    //all remaining players were killed by storm
                    if (playersKilledByStorm.length == countAliveBeforeBlasts) {
                        // mark all winPositions as 2
                        for (let i = 0; i < playersKilledByStorm.length; i++) {
                            const player = playersKilledByStorm[i];
                            player.winPosition = 2;
                            await player.save();
                        }

                        await this.endGameAndBeginAnew('tied', playersKilledByStorm, guild);
                        return;
                    }

                    // if some were killed, but not all, save the dead's winPositions
                    if (playersKilledByStorm.length > 0 && playersKilledByStorm.length < countAliveBeforeBlasts) {
                        const countRemaining = countAliveBeforeBlasts - playersKilledByStorm.length;
                        for (let i = 0; i < playersKilledByStorm.length; i++) {
                            const player = playersKilledByStorm[i];
                            player.winPosition = countRemaining + 1;
                            await player.save();
                        }
                    }

                    // if only one player remains, they win
                    if (playersKilledByStorm.length > 0 && countAliveBeforeBlasts - playersKilledByStorm.length == 1) {
                        let lastBro = this.constructor.getLivingPlayers(livingPlayers)[0];
                        lastBro.winPosition = 1;
                        await lastBro.save();
                        await this.endGameAndBeginAnew('won', [lastBro], guild);
                        return;
                    }

                    //don't grow wider than half the width
                    if (this.suddenDeathRound < Math.ceil(this.boardHeight / 2)) {
                        this.suddenDeathRound += 1;
                    }
                    await this.save();
                }

            } catch (error) {
                console.log("game.doTick error", error)
            }

        }

        async giveAllLivingPlayersAP(ap) {
            await this.sequelize.query('UPDATE "GamePlayers" SET actions = actions + ? WHERE "GameId" = ? AND status = ?', {
                replacements: [ap, this.id, 'alive']
            })
        }

        static async createNewGame(guildId) {
            try {

                // check if there's an active game
                const guild = await this.sequelize.models.Guild.findByPk(guildId)
                if (guild === null) {
                    throw new Error("Invalid guild")
                }

                if (guild.currentGameId) {
                    throw new Error("Already a game in progress")
                }

                // create the game
                const game = this.build({
                    minutesPerActionDistro: guild.actionTimerMinutes,
                    boardWidth: guild.boardSize,
                    boardHeight: guild.boardSize,
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
                game.notify("Alright! 🃏 [New Infight Game](" + game.getUrl() + ") created with " + optedInGuildMembers.length + " players!")

                //choose about starting in an hour, or waiting for more to join
                if (optedInGuildMembers.length < game.minimumPlayerCount) {
                    game.notify("To start [the new game](" + game.getUrl() + "), there need to be at least " + game.minimumPlayerCount + " players. Ask a friend to `/infight-join`!")
                } else {
                    game.checkShouldStartGame()
                }


                return game

            } catch (error) {
                console.log('CreateNewGame error', error)
                throw error
            }
        }

        async cancelAndStartNewGame() {
            this.notify("⚠️ Game " + this.id + " cancelled by an admin. Sorry about that! New game coming up!")
            const guildId = this.GuildId
            this.status = 'cancelled'
            await this.save();

            const GameRef = this.sequelize.models.Game
            const guild = await this.sequelize.models.Guild.findByPk(guildId)
            if (guild != null) {
                guild.currentGameId = null
                const guildSave = await guild.save()
            }

            await GameRef.createNewGame(guild.id)
        }

        async doMove(player, action, targetX, targetY) {
            //TODO: move doMove here from app.js


            if (this.status != 'active') {
                throw new Error("Game is not active")
            }


            // get current GamePlayer
            var gp = null
            for (let i = 0; i < this.GamePlayers.length; i++) {
                const foundGp = this.GamePlayers[i];
                if (foundGp.PlayerId == player.id) {
                    gp = foundGp
                }
            }
            if (!gp) {
                throw new Error("You aren't in this game")
            }

            if (gp.actions < 1 && !['giveHP', 'juryVote'].includes(action)) {
                throw new Error("You don't have enough AP")
            }

            if (gp.status != 'alive' && action != 'juryVote') {
                throw new Error("You're not alive.")
            }

            const guild = await this.sequelize.models.Guild.findByPk(this.GuildId)
            if (!guild) {
                throw new Error("You aren't in this game")
            }


            if (Number.isInteger(targetX) && Number.isInteger(targetY)) {
                if (targetX < 0 || targetX >= this.boardWidth || targetY < 0 || targetY > this.boardHeight - 1) {
                    throw new Error("Action is off the board")
                }
            }

            const move = this.sequelize.models.Move.build({
                GameId: this.id,
                action: action,
                targetPositionX: targetX,
                targetPositionY: targetY,
                actingGamePlayerId: gp.id
            })

            //for aimed actions, check range and target values
            const currentX = gp.positionX
            const currentY = gp.positionY
            if (['move', 'shoot', 'giveAP', 'giveHP', 'juryVote'].includes(action)) {
                if (isNaN(Number(targetX)) || isNaN(Number(targetY))) {
                    throw new Error("Target is not numeric")
                }

                let testRange = 1
                if (action != 'move') testRange = gp.range
                if (action != 'juryVote') {
                    if (targetX < currentX - testRange || targetX > currentX + testRange || targetY < currentY - testRange || targetY > currentY + testRange) {
                        throw new Error("That is out of range")
                    }
                }
            }

            //find any player in the target space
            let targetGamePlayer = null;
            for (let i = 0; i < this.GamePlayers.length; i++) {
                const somePlayer = this.GamePlayers[i];
                if (somePlayer.positionX == targetX && somePlayer.positionY == targetY) {
                    targetGamePlayer = somePlayer
                }
            }


            if (action == 'juryVote') {
                if (gp.health > 0) {
                    throw new Error("You need to be dead to vote")
                }

                if (gp.juryVotesToSpend == 0) {
                    throw new Error("You've already voted")
                }

                if (targetGamePlayer.status != 'alive') {
                    throw new Error("That fool's dead")
                }

                gp.juryVotesToSpend = 0
                targetGamePlayer.juryVotesAgainst += 1
                Stats.increment(gp, Stats.GamePlayerStats.castVote)
                Stats.increment(targetGamePlayer, Stats.GamePlayerStats.receivedVote)

                await gp.save()
                await targetGamePlayer.save()
                await move.save()

                this.notify("<@" + gp.PlayerId + "> 🗳️ **voted** to treat someone! 🍬")

                return "Voted!"
            }

            if (action == 'upgrade') {
                if (gp.actions < 3) {
                    throw new Error("You don't have enough AP")
                }
                gp.range += 1
                gp.actions -= 3
                Stats.increment(gp, Stats.GamePlayerStats.upgradedRange)

                await gp.save()
                await move.save()

                this.notify("<@" + gp.PlayerId + "> 🔧 **upgraded** their range to " + gp.range + "!")

                return "Upgraded!"
            }

            if (action == 'heal') {
                if (gp.actions < 3) {
                    throw new Error("You don't have enough AP")
                }
                gp.health += 1
                gp.actions -= 3
                Stats.increment(gp, Stats.GamePlayerStats.healed)

                await gp.save()
                await move.save()

                this.notify("<@" + gp.PlayerId + "> ❤️ **healed** to **" + gp.health + "**!")

                return "Upgraded!"
            }

            if (action == 'move') {
                if (targetGamePlayer != null) {
                    throw new Error("A player is already in that space")
                }

                // did they collect a heart
                let collectedHeart = false
                for (let i = 0; i < this.boardHeartLocations.length; i++) {
                    const heartSpot = this.boardHeartLocations[i];
                    if (heartSpot[0] == targetX && heartSpot[1] == targetY) {
                        gp.health += 1
                        this.boardHeartLocations.splice(i, 1)
                        this.changed('boardHeartLocations', true); // deep change operations in a json field aren't automatically detected by sequelize
                        await this.save()
                        collectedHeart = true
                        break
                    }
                }

                const directionDescription = this.sequelize.models.Move.describeMoveDirection([gp.positionX, gp.positionY], [targetX, targetY])

                gp.positionX = targetX
                gp.positionY = targetY
                gp.actions -= 1

                const movementVerb = this.sequelize.models.Move.getRandomMovementDescriptionWithEmoji()
                let heartPickupText = ''
                if (collectedHeart) {
                    heartPickupText = ' and collected a heart 💖'
                    Stats.increment(gp, Stats.GamePlayerStats.pickedUpHp)
                }
                Stats.increment(gp, Stats.GamePlayerStats.walked)

                await gp.save()
                await move.save()
                this.notify(`<@${gp.PlayerId}> ${movementVerb} ${directionDescription}${heartPickupText}!`)

                return "Moved!"
            }

            if (action == 'giveAP') {
                if (targetGamePlayer == null) {
                    throw new Error("There's no player at that target to gift")
                }

                targetGamePlayer.actions += 1
                gp.actions -= 1
                Stats.increment(gp, Stats.GamePlayerStats.gaveAp)
                Stats.increment(targetGamePlayer, Stats.GamePlayerStats.wasGiftedAp)

                await gp.save()
                await targetGamePlayer.save()
                move.targetGamePlayerId = targetGamePlayer.id
                await move.save()

                this.notify("<@" + gp.PlayerId + "> (" + gp.actions + " AP) 🤝 gave an AP to <@" + targetGamePlayer.PlayerId + "> (" + targetGamePlayer.actions + " AP)!")

                return "Gave AP!"
            }

            if (action == 'giveHP') {
                if (targetGamePlayer == null) {
                    throw new Error("There's no player at that target to gift")
                }

                if (gp.health < 2) {
                    throw new Error("You don't have enough health to give")
                }

                targetGamePlayer.health += 1
                Stats.increment(targetGamePlayer, Stats.GamePlayerStats.gotHp)
                if (targetGamePlayer.health == 1) { // do a resurrection!
                    targetGamePlayer.status = 'alive'
                    targetGamePlayer.winPosition = null
                    targetGamePlayer.deathTime = null

                    Stats.increment(gp, Stats.GamePlayerStats.resurrector)
                    Stats.increment(targetGamePlayer, Stats.GamePlayerStats.resurrectee)

                    await targetGamePlayer.save()

                    //reshuffle the winPositions in the GamePlayers
                    let allPlayers = await this.sequelize.models.GamePlayer.findAll({
                        where: {
                            GameId: this.id
                        },
                        order: [
                            ['deathTime', 'ASC', 'NULLS LAST']
                        ]
                    })

                    for (let i = 0; i < allPlayers.length; i++) {
                        const maybeDeadPlayer = allPlayers[i];
                        if (maybeDeadPlayer.health == 0) {
                            maybeDeadPlayer.winPosition = allPlayers.length - i
                            maybeDeadPlayer.save() //not awaited, might race condition 
                        }
                    }

                }
                gp.health -= 1
                Stats.increment(gp, Stats.GamePlayerStats.gaveHp)

                await gp.save()
                await targetGamePlayer.save()
                move.targetGamePlayerId = targetGamePlayer.id
                await move.save()

                if (targetGamePlayer.health == 1) {
                    this.notify("<@" + gp.PlayerId + "> 😇 brought <@" + targetGamePlayer.PlayerId + "> back from the dead!")

                } else {
                    this.notify("<@" + gp.PlayerId + "> (" + gp.health + " HP) 💌 gave an HP to <@" + targetGamePlayer.PlayerId + "> (" + targetGamePlayer.health + " HP)!")
                }

                return "Gave HP!"
            }

            if (action == 'shoot') {

                if (!targetGamePlayer) {
                    throw new Error("No player at that position")
                }

                if (targetGamePlayer.health <= 0) {
                    throw new Error("They're dead, Jim!")
                }

                Stats.increment(gp, Stats.GamePlayerStats.shotSomeone)
                Stats.increment(targetGamePlayer, Stats.GamePlayerStats.wasShot)

                targetGamePlayer.health -= 1
                if (targetGamePlayer.health < 1) {

                    Stats.increment(gp, Stats.GamePlayerStats.killedSomeone)
                    Stats.increment(targetGamePlayer, Stats.GamePlayerStats.wasKilled)

                    targetGamePlayer.status = 'dead'
                    const stolenHP = targetGamePlayer.actions
                    gp.actions += stolenHP  // give the killer the AP of the killed
                    targetGamePlayer.actions = 0
                    targetGamePlayer.juryVotesToSpend = 1
                    targetGamePlayer.deathTime = new Date()
                }

                //check if game is over
                let countAlive = this.constructor.getLivingPlayers(this.GamePlayers).length
                targetGamePlayer.winPosition = countAlive + 1
                await targetGamePlayer.save()

                gp.actions -= 1
                await gp.save()

                move.targetGamePlayerId = targetGamePlayer.id
                await move.save()

                let shotMsg = "<@" + gp.PlayerId + "> **💥shot💥** <@" + targetGamePlayer.PlayerId + ">, reducing their health to **" + targetGamePlayer.health + "**! 🩸"
                if (targetGamePlayer.health == 0) {
                    shotMsg = "### <@" + gp.PlayerId + "> **☠️ ELIMINATED ☠️** <@" + targetGamePlayer.PlayerId + ">  and stole their AP!"
                }
                this.notify(shotMsg)

                //start sudden death
                if (countAlive == 2 && this.suddenDeathRound == 0) {
                    this.suddenDeathRound = 1
                    await this.save()
                    this.notify("🚨 **Sudden Death!** Only two players remain! The storm approaches! 🌪️")
                }

                if (countAlive == 1) {
                    gp.winPosition = 1
                    await gp.save()
                    await this.endGameAndBeginAnew('won', [gp], guild)
                }


                return "Shot!"
            }

            throw new Error("Action Not implemented", action)
        }



        async endGameAndBeginAnew(winType, winningPlayerArray, guild) {
            this.status = winType

            if (winningPlayerArray.length == 1) {
                this.winningPlayerId = winningPlayerArray[0].id
                this.notify("# 🎉 👑 <@" + winningPlayerArray[0].PlayerId + "> **_WON THE INFIGHT!!_** 🏁 🎉")
            }

            if (winningPlayerArray.length > 1) {
                this.notify("# 🥈 👔 <@" + winningPlayerArray.map(gp => gp.PlayerId).join('> and <@') + "> **_TIED FOR 2nd!!_** 🏁 🤝")
            }

            await this.save()
            guild.currentGameId = null
            await guild.save()

            await this.sendAfterActionReport()

            await this.sequelize.models.Game.createNewGame(this.GuildId)
        }

        static getLivingPlayers(gamePlayers) {
            let livingPlayers = []
            for (let i = 0; i < gamePlayers.length; i++) {
                const somePlayer = gamePlayers[i]
                if (somePlayer.status == 'alive') {
                    livingPlayers.push(somePlayer)
                }
            }
            return livingPlayers
        }

        async addHeart() {
            const gamePlayers = await this.getGamePlayers()
            const freeSpace = await this.#findClearSpace(gamePlayers)

            if (!Array.isArray(this.boardHeartLocations)) {
                this.boardHeartLocations = []
            }
            this.boardHeartLocations.push(freeSpace)

            this.changed('boardHeartLocations', true); // deep change operations in a json field aren't automatically detected by sequelize

            //console.log('added a heart at', freeSpace)
            const saveResult = await this.save()
            //console.log('saveResult', saveResult)
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

        static calculateBoardSize(playerCount, desiredDensity = 0.2) {
            if (playerCount <= 0 || desiredDensity <= 0) {
                throw new Error("calculateBoardSize Player count and density must be greater than zero.");
            }

            // Calculate the required board area for the given density
            const requiredArea = playerCount / desiredDensity;

            // Determine the side length of the square board
            const boardSize = Math.ceil(Math.sqrt(requiredArea));
            return boardSize;
        }

        async sendAfterActionReport() {

            //after action report
            let allPlayers = await this.sequelize.models.GamePlayer.findAll({
                where: {
                    GameId: this.id
                },
                order: [
                    ['winPosition', 'ASC']
                ]
            })
            let leaderBoard = "### 🏆 Game Rankings 🏆"
            allPlayers.forEach(ep => {
                leaderBoard += `\n`
                switch (ep.winPosition) {
                    case 1:
                        leaderBoard += '🥇'
                        break;
                    case 2:
                        leaderBoard += '🥈'
                        break;
                    case 3:
                        leaderBoard += '🥉'
                        break;
                    default:
                        leaderBoard += `*${ep.winPosition}.*`
                        break
                }
                leaderBoard += ` <@${ep.PlayerId}>`
                if (typeof ep.stats.killedSomeone !== 'undefined') {
                    leaderBoard += ` 🩸Kills: ${ep.stats.killedSomeone}`
                }
            })
            this.notify(leaderBoard)
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
            winningPlayerId: {
                type: DataTypes.STRING,
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
            },
            suddenDeathRound: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            }
        },
        { sequelize }
    )

    return Game

}