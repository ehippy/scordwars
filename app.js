console.log("Starting scordwards server")

require('dotenv').config()
const settings = {
  discord_oauth2_client_id: process.env.DISCORD_OAUTH2_CLIENT_ID,
  discord_oauth2_client_secret: process.env.DISCORD_OAUTH2_CLIENT_SECRET,
  discordCallbackURL: '/auth/discord/callback',
  discordToken: process.env.DISCORD_BOT_TOKEN,
  sessionSecret: process.env.SESSION_SECRET,
  uiUrl: 'http://localhost:5173/'
}

const express = require('express')
const app = express()
const cors = require('cors')
const port = 3000
app.use(express.json());
app.use(cors())

const infightDB = require('./data/infightDB')
infightDB.init()

const infightLogin = require("./auth/login")(app, settings, infightDB)
const verifyToken = require("./auth/tokenAuthMiddleware")

const ifDisco = require('./discord/ifDiscord')(infightDB)


app.get('/', (req, res) => {
  console.log(ifDisco.guilds.cache)
  res.send('Hello from the infight api!')
})

app.get('/myTeams', verifyToken, async (req, res) => {

  const player = await infightDB.Player.findByPk(req.user.id)
  if (player === null) {
    res.send('404')
    next()
  }

  const guilds = await player.getGuilds()
  res.send(guilds)
})

app.post('/games/:teamId/new', verifyToken, async (req, res) => {

  const t = await infightDB.sequelize.transaction();

  try {
    const player = await infightDB.Player.findByPk(req.user.id)
    if (player === null) {
      return res.status(404).send(new Error("User not logged in"))
    }

    //check if we got a good id
    if (!req.params.teamId) {
      return res.status(404).send(new Error("Invalid teamId"))
    }

    // check if there's an active game
    const guild = await infightDB.Guild.findByPk(req.params.teamId);
    if (guild === null) {
      return res.status(404).send(new Error("Invalid teamId"))
    }

    if (guild.currentGameId) {
      return res.status(409).send(new Error("Already a game in progress"))
    }

    // check to make sure the user is a member of the server
    const matchingGuilds = await infightDB.PlayerGuild.findAndCountAll({
      where: {
        PlayerId: player.id,
        GuildId: req.params.teamId
      }
    })
    if (matchingGuilds.count == 0) {
      return res.send(new Error("Player not a member of that team", { statusCode: 409 }))
    }

    // check for input size, cycle time, 
    const cycleHours = req.body.cycleHours;
    if (!cycleHours || isNaN(cycleHours) || cycleHours < 1 || cycleHours > 24) {
      return res.send(new Error("cycleHours is not valid", { statusCode: 400 }))
    }

    const boardSize = req.body.boardSize;
    if (!boardSize || isNaN(boardSize) || boardSize < 5 || boardSize > 100) {
      return res.send(new Error("boardSize is not valid", { statusCode: 400 }))
    }

    // get all the relevant active players...?

    // create the game
    const startDate = new Date()
    startDate.setHours(startDate.getHours() + 2)

    const game = infightDB.Game.build({
      minutesPerActionDistro: cycleHours * 60,
      boardWidth: boardSize,
      boardHeight: boardSize,
      GuildId: req.params.teamId,
      startTime: startDate,
    })

    await game.save({ transaction: t })
    console.log('created game ' + game.id, game)

    //set the current game on the Guild
    guild.currentGameId = game.id
    await guild.save({ transaction: t })

    //find all opted-in players and add them to the game
    const optedInGuildMembers = await infightDB.PlayerGuild.findAll({
      where: {
        GuildId: req.params.teamId,
        isOptedInToPlay: true
      }
    })

    // send some hype abouut the muster period)
    const GamePlayersToCreate = []
    optedInGuildMembers.forEach(gm => {
      const gamePlayer = {
        GameId: game.id,
        PlayerId: gm.PlayerId
      }
      GamePlayersToCreate.push(gamePlayer)
    });

    const playerCreateResult = await infightDB.GamePlayer.bulkCreate(GamePlayersToCreate, { transaction: t, validate: true })

    t.commit()

    const guildChannel = ifDisco.channels.cache.get(guild.gameChannelId)
    guildChannel.send("Game created!")

    res.send(game)

  } catch (error) {
    t.rollback()
    return res.status(400).send(error)
  }

})


app.get('/games/:teamId/:gameId', async (req, res) => {

  //check if we got a good id
  if (!req.params.teamId) {
    return res.status(404).send(new Error("Invalid teamId"))
  }

  //check if we got a good id
  if (!req.params.gameId) {
    return res.status(404).send(new Error("Invalid gameId"))
  }

  const game = await infightDB.Game.findByPk(req.params.gameId, {
    include: [{
      model: infightDB.GamePlayer,
      include: {
        model: infightDB.Player
      }
    }, {
      model: infightDB.Guild
    }, {
      model: infightDB.Move
    }
    ]
  });
  if (!game) {
    return res.status(404).send(new Error("Game not found"))
  }

  res.send(game)
})

app.delete('/games/:teamId/:gameId', async (req, res) => {
  //TODO: this needs AUTH consideration
  //check if we got a good id
  if (!req.params.teamId) {
    return res.status(404).send(new Error("Invalid teamId"))
  }

  //check if we got a good id
  if (!req.params.gameId) {
    return res.status(404).send(new Error("Invalid gameId"))
  }

  const game = await infightDB.Game.findByPk(req.params.gameId, { include: { all: true } });
  const delResult = await game.destroy();

  const guild = await infightDB.Guild.findByPk(req.params.teamId)
  if (guild.currentGameId == req.params.gameId) {
    guild.currentGameId = null
    const guildSave = await guild.save()
  }

  const guildChannel = ifDisco.channels.cache.get(guild.gameChannelId)
  guildChannel.send("Game " + req.params.gameId + " deleted?!")

  res.send(game)
})


app.post('/games/:teamId/:gameId/start', async (req, res) => {
  //TODO: this needs AUTH consideration
  //check if we got a good id
  if (!req.params.teamId) {
    return res.status(404).send("Invalid teamId")
  }

  //check if we got a good id
  if (!req.params.gameId) {
    return res.status(404).send("Invalid gameId")
  }

  const game = await infightDB.Game.findByPk(req.params.gameId, { include: { all: true } });
  if (!game) {
    return res.status(404).send("Invalid gameId")
  }

  if (game.status != 'new') {
    return res.status(400).send("Game is not ready to be started")
  }

  const guild = await infightDB.Guild.findByPk(req.params.teamId)
  if (!guild) {
    return res.status(404).send("Invalid teamId")
  }

  //position the players
  const startingPositions = []
  for (i = 0; i < game.GamePlayers.length; i++) {
    var foundClearSpace = false
    while (!foundClearSpace) {
      foundClearSpace = true

      const newPos = [
        Math.floor(Math.random() * game.boardWidth),
        Math.floor(Math.random() * game.boardHeight)
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
    game.GamePlayers[index].positionX = startingPos[0]
    game.GamePlayers[index].positionY = startingPos[1]

    const saveResult = await game.GamePlayers[index].save()
    console.log('saved starting position', saveResult)
  }
  //set the next AP distro time, change the game status to active
  const thisMoment = new Date()
  const nextTick = new Date(+new Date(thisMoment) + game.minutesPerActionDistro * 60 * 1000)
  game.status = 'active'
  game.startTime = thisMoment
  game.nextTickTime = nextTick

  const gameSaved = await game.save()

  const guildChannel = ifDisco.channels.cache.get(guild.gameChannelId)
  guildChannel.send("Game " + req.params.gameId + " started!")

  res.send(game)
})
app.post('/games/:teamId/:gameId/tick', async (req, res) => {
  //TODO: this needs AUTH consideration
  //check if we got a good id
  if (!req.params.teamId) {
    return res.status(404).send("Invalid teamId")
  }

  //check if we got a good id
  if (!req.params.gameId) {
    return res.status(404).send("Invalid gameId")
  }

  const game = await infightDB.Game.findByPk(req.params.gameId, { include: { all: true } });
  if (!game) {
    return res.status(404).send("Invalid gameId")
  }

  if (game.status != 'active') {
    return res.status(400).send("Game is not ready to be ticked")
  }

  const guild = await infightDB.Guild.findByPk(req.params.teamId)
  if (!guild) {
    return res.status(404).send("Invalid teamId")
  }

  try {
    const thisMoment = new Date()
    const nextTick = new Date(+new Date(thisMoment) + game.minutesPerActionDistro * 60 * 1000)
    game.nextTickTime = nextTick
    const gameSaved = await game.save()

    const [results, metadata] = await infightDB.sequelize.query('UPDATE "GamePlayers" SET actions = actions + 1 WHERE "GameId" = ? AND status = ?', {
      replacements: [game.id, 'alive']
    })
  } catch (error) {
    return res.status(400).send("Game tick failed")
  }

  const guildChannel = ifDisco.channels.cache.get(guild.gameChannelId)
  guildChannel.send("Game " + req.params.gameId + " has distributed new action points!")

  res.send(game)
})


app.post('/games/:teamId/:gameId/act', verifyToken, async (req, res) => {

  const action = req.body.action
  const targetX = req.body.targetX
  const targetY = req.body.targetY

  if (!['move', 'shoot', 'give', 'upgrade'].includes(action)) {
    return res.status(400).send("Action '" + action + "' not supported")
  }

  const player = await infightDB.Player.findByPk(req.user.id)
  if (player === null) {
    return res.status(404).send("User not logged in")
  }

  //check if we got a good id
  if (!req.params.teamId) {
    return res.status(404).send("Invalid teamId")
  }

  //check if we got a good id
  if (!req.params.gameId) {
    return res.status(404).send("Invalid gameId")
  }

  const game = await infightDB.Game.findByPk(req.params.gameId, { include: { all: true } });
  if (!game) {
    return res.status(404).send("Invalid gameId")
  }

  if (game.status != 'active') {
    return res.status(400).send("Game is not active")
  }

  const guild = await infightDB.Guild.findByPk(req.params.teamId)
  if (!guild) {
    return res.status(404).send("Invalid teamId")
  }

  const guildChannel = ifDisco.channels.cache.get(guild.gameChannelId)

  // get current GamePlayer
  var gp = null
  for (let i = 0; i < game.GamePlayers.length; i++) {
    const foundGp = game.GamePlayers[i];
    if (foundGp.PlayerId == player.id) {
      gp = foundGp
    }
  }
  if (!gp) {
    return res.status(404).send("You aren't in this game")
  }

  if (gp.actions < 1) {
    return res.status(400).send("You don't have enough AP")
  }

  if (gp.status != 'alive') {
    return res.status(400).send("You're not alive.")
  }

  if (Number.isInteger(targetX) && Number.isInteger(targetY)) {
    if (targetX < 0 || targetX >= game.boardWidth || targetY < 0 || targetY > game.boardHeight - 1) {
      return res.status(400).send("Action is off the board")
    }
  }

  const move = infightDB.Move.build({
    GameId: game.id,
    action: action,
    targetPositionX: targetX,
    targetPositionY: targetY,
    actingGamePlayerId: gp.id
  })

  //for aimed actions, check range and target values
  const currentX = gp.positionX
  const currentY = gp.positionY
  if (['move', 'shoot', 'give'].includes(action)) {
    if (Number.isNaN(targetX) || Number.isNaN(targetY)) {
      return res.status(400).send("Target is not numeric")
    }

    let testRange = 1
    if (action != 'move') testRange = gp.range

    if (targetX < currentX - testRange || targetX > currentX + testRange || targetY < currentY - testRange || targetY > currentY + testRange) {
      return res.status(400).send("That is out of range")
    }
  }

  //find any living player in the target space
  let targetGamePlayer = null;
  for (let i = 0; i < game.GamePlayers.length; i++) {
    const somePlayer = game.GamePlayers[i];
    if (somePlayer.status == 'alive' && somePlayer.positionX == targetX && somePlayer.positionY == targetY) {
      targetGamePlayer = somePlayer
    }
  }

  try {

    if (action == 'upgrade') {
      if (gp.range >= 3) {
        return res.status(400).send("Range is already at maximum (3)")
      }
      gp.range += 1
      gp.actions -= 1

      await gp.save()
      await move.save()

      guildChannel.send("<@" + gp.PlayerId + "> 🔧 **upgraded** their range to " + gp.range + "!")

      return res.send("Upgraded!")
    }

    if (action == 'move') {
      if (targetGamePlayer != null) {
        return res.status(400).send("A player is already in that space")
      }

      gp.positionX = targetX
      gp.positionY = targetY
      gp.actions -= 1

      await gp.save()
      await move.save()

      guildChannel.send("<@" + gp.PlayerId + "> 🏃 moved!")

      return res.send("Moved!")
    }

    if (action == 'give') {
      if (targetGamePlayer == null) {
        return res.status(400).send("There's no player at that target to gift")
      }

      targetGamePlayer.actions += 1
      gp.actions -= 1

      await gp.save()
      await targetGamePlayer.save()
      move.targetGamePlayerId = targetGamePlayer.id
      await move.save()

      guildChannel.send("<@" + gp.PlayerId + "> (" + gp.actions + " AP) 🤝 gave an AP to <@" + targetGamePlayer.PlayerId + "> (" + targetGamePlayer.actions + " AP)!")

      return res.send("Gave!")
    }

    if (action == 'shoot') {

      if (!targetGamePlayer) {
        return res.status(400).send("No player at that position")
      }

      targetGamePlayer.health -= 1
      if (targetGamePlayer.health < 1) {
        targetGamePlayer.status = 'dead'
        targetGamePlayer.positionX = null
        targetGamePlayer.positionY = null
      }
      await targetGamePlayer.save()

      gp.actions -= 1
      await gp.save()

      move.targetGamePlayerId = targetGamePlayer.id
      await move.save()

      if (targetGamePlayer.health > 0) {
        guildChannel.send("<@" + gp.PlayerId + "> **💥shot💥** <@" + targetGamePlayer.PlayerId + ">, reducing their health to **" + targetGamePlayer.health + "**!")
      } else {
        guildChannel.send("<@" + gp.PlayerId + "> **☠️ ELIMINATED ☠️** <@" + targetGamePlayer.PlayerId + ">!")
      }

      //check if game is over
      let countAlive = 0
      for (let i = 0; i < game.GamePlayers.length; i++) {
        const somePlayer = game.GamePlayers[i];
        if (somePlayer.status == 'alive') {
          countAlive++
        }
      }
      if (countAlive == 1) {
        game.status = 'won'
        game.winningPlayerId = gp.id
        await game.save()

        guild.currentGameId = null
        await guild.save()

        guildChannel.send("<@" + gp.PlayerId + "> **_WON THE GAME!!_**")

        //TODO: after action report
      }


      return res.send("Shot!")
    }

    return res.status(500).send("Not implemented")

  } catch (error) {
    return res.status(400).send("Action failed")
  }

  res.send(game)
})


// Endpoints needed
// Games: Create, Get
// Moves: Create

// How to run the game CRON?

app.listen(port, () => {
  console.log(`Infight server listening on port ${port}`)
})