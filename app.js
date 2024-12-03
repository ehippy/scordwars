console.log("Starting scordwards server")

require('dotenv').config()
const authSettings = {
  discord_oauth2_client_id: process.env.DISCORD_OAUTH2_CLIENT_ID,
  discord_oauth2_client_secret: process.env.DISCORD_OAUTH2_CLIENT_SECRET,
  discordCallbackURL: '/auth/discord/callback',
  discordToken: process.env.DISCORD_BOT_TOKEN,
  sessionSecret: process.env.SESSION_SECRET,
  uiUrl: process.env.UI_BASE_URL
}

const express = require('express')
const app = express()
const cors = require('cors')
const port = 3000
app.use(express.json());
app.use(cors())


// an object containing Server Sent Event (SSE) broadcast channels for each game
const { createSession, createChannel } = require("better-sse");
const InfightNotifier = {
  sseChannels: {},
  disco: null,
  async addToChannel(req, res) { //saves an HTTP connection to a particular channel for later notification
    const session = await createSession(req, res);
    const gameId = req.params.gameId
    if (!this.sseChannels[gameId]) {
      this.sseChannels[gameId] = createChannel()
    }
    this.sseChannels[gameId].register(session)

    session.push("You're connected to game events");
  },
  async notify(game, msg) { //sends a string out to all channels for a game
    //tell discord
    const guild = await infightDB.sequelize.models.Guild.findByPk(game.GuildId) //TODO too many queries, cache gameChannelId somewhere
    const guildChannel = this.disco.channels.cache.get(guild.gameChannelId)
    guildChannel.send(msg)

    //tell SSE
    if (this.sseChannels[game.id]) {
      this.sseChannels[game.id].broadcast(msg)
    }
  },
  async notifyGameId(gameId, msg) {
    const game = await infightDB.models.Game.getByPk(gameId)
    this.notify(game, msg)
  }
}


const infightDB = require('./models/infightDB')
infightDB.init()
infightDB.sequelize.models.Game.notifier = InfightNotifier // add the notifier to the Game model so its available to Games

const infightLogin = require("./auth/login")(app, authSettings, infightDB)
const verifyToken = require("./auth/tokenAuthMiddleware")


const ifDisco = require('./discord/ifDiscord')(infightDB)
InfightNotifier.disco = ifDisco // attach discord to the notifier

app.get('/', (req, res) => {
  //console.log(ifDisco.guilds.cache)
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

  //TODO: lock this to only in DEV, this should normally be done in discord with /infight-start
  try {
    const newGame = await infightDB.Game.createNewGame(req.params.teamId, req.body.boardSize, req.body.boardSize, req.body.cycleMinutes)
    res.send(newGame)
  } catch (error) {
    res.status(404).send(error)
  }
})

app.get('/games/:teamId/:gameId', async (req, res) => {

  //check if we got a good id
  if (!req.params.teamId) {
    return res.status(404).send(new Error("Invalid teamId"))
  }

  //check if we got a good id
  if (!req.params.gameId || Number.isNaN(Number.parseInt(req.params.gameId))) {
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
    return res.status(404).send("Game not found")
  }

  res.send(game)
})

app.get("/games/:teamId/:gameId/events", async (req, res) => {
  InfightNotifier.addToChannel(req, res)
});

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

  game.notify("Game " + req.params.gameId + " deleted?!")
  res.send(game)
})


app.post('/games/:teamId/:gameId/start', async (req, res) => {
  //TODO: this needs AUTH consideration
  //check if we got a good id

  const game = await infightDB.Game.findByPk(req.params.gameId);
  if (!game) {
    return res.status(404).send("Invalid gameId")
  }

  try {
    const result = await game.startGame()
    res.send(game)
  } catch (error) {
    return res.status(404).send(error)
  }

})

app.post('/games/:teamId/:gameId/tick', async (req, res) => {
  //TODO: this needs DEV MODE disabling

  const game = await infightDB.Game.findByPk(req.params.gameId)
  if (null == game) {
    return res.status(400).send('Game not found')
  }
  try {
    const result = await game.doTick()
    res.send(result)
  } catch (error) {
    res.status(400).send(error)
  }
})

app.post('/games/:teamId/:gameId/hearts', async (req, res) => { //TODO this needs to be implemented
  //TODO: this needs DEV MODE disabling

  console.log("Starting heart drop for " + gameId)
  //check if we got a good id
  if (!teamId) {
    return new Error("Invalid teamId")
  }

  //check if we got a good id
  if (!gameId) {
    return new Error("Invalid gameId")
  }

  const game = await infightDB.Game.findByPk(gameId, { include: { all: true } });
  if (!game) {
    return new Error("Invalid gameId")
  }

  if (result instanceof Error) {
    res.status(400).send(result)
  } else {
    res.send(result)
  }
})

app.post('/games/:teamId/:gameId/act', verifyToken, async (req, res) => {

  const action = req.body.action
  const targetX = req.body.targetX
  const targetY = req.body.targetY

  if (!['move', 'shoot', 'giveAP', 'giveHP', 'upgrade', 'heal'].includes(action)) {
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

  if (gp.actions < 1 && action != 'giveHP') {
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
  if (['move', 'shoot', 'giveAP', 'giveHP'].includes(action)) {
    if (Number.isNaN(targetX) || Number.isNaN(targetY)) {
      return res.status(400).send("Target is not numeric")
    }

    let testRange = 1
    if (action != 'move') testRange = gp.range

    if (targetX < currentX - testRange || targetX > currentX + testRange || targetY < currentY - testRange || targetY > currentY + testRange) {
      return res.status(400).send("That is out of range")
    }
  }

  //find any player in the target space
  let targetGamePlayer = null;
  for (let i = 0; i < game.GamePlayers.length; i++) {
    const somePlayer = game.GamePlayers[i];
    if (somePlayer.positionX == targetX && somePlayer.positionY == targetY) {
      targetGamePlayer = somePlayer
    }
  }

  try {

    if (action == 'upgrade') {
      if (gp.actions < 3) {
        return res.status(400).send("You don't have enough AP")
      }
      gp.range += 1
      gp.actions -= 3

      await gp.save()
      await move.save()

      game.notify("<@" + gp.PlayerId + "> 🔧 **upgraded** their range to " + gp.range + "!")

      return res.send("Upgraded!")
    }

    if (action == 'heal') {
      if (gp.actions < 3) {
        return res.status(400).send("You don't have enough AP")
      }
      gp.health += 1
      gp.actions -= 3

      await gp.save()
      await move.save()

      game.notify("<@" + gp.PlayerId + "> ❤️ **healed** to **" + gp.health + "**!")

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

      game.notify("<@" + gp.PlayerId + "> 🏃 moved!")

      return res.send("Moved!")
    }

    if (action == 'giveAP') {
      if (targetGamePlayer == null) {
        return res.status(400).send("There's no player at that target to gift")
      }

      targetGamePlayer.actions += 1
      gp.actions -= 1

      await gp.save()
      await targetGamePlayer.save()
      move.targetGamePlayerId = targetGamePlayer.id
      await move.save()

      game.notify("<@" + gp.PlayerId + "> (" + gp.actions + " AP) 🤝 gave an AP to <@" + targetGamePlayer.PlayerId + "> (" + targetGamePlayer.actions + " AP)!")

      return res.send("Gave AP!")
    }

    if (action == 'giveHP') {
      if (targetGamePlayer == null) {
        return res.status(400).send("There's no player at that target to gift")
      }

      if (gp.health < 2) {
        return res.status(400).send("You don't have enough health to give")
      }

      targetGamePlayer.health += 1
      if (targetGamePlayer.health == 1) {
        targetGamePlayer.status = 'alive'
      }
      gp.health -= 1

      await gp.save()
      await targetGamePlayer.save()
      move.targetGamePlayerId = targetGamePlayer.id
      await move.save()

      game.notify("<@" + gp.PlayerId + "> (" + gp.health + " HP) 💌 gave an HP to <@" + targetGamePlayer.PlayerId + "> (" + targetGamePlayer.health + " HP)!")

      return res.send("Gave HP!")
    }

    if (action == 'shoot') {

      if (!targetGamePlayer) {
        return res.status(400).send("No player at that position")
      }

      targetGamePlayer.health -= 1
      if (targetGamePlayer.health < 1) {
        targetGamePlayer.status = 'dead'
        const stolenHP = targetGamePlayer.actions
        gp.actions += stolenHP  // give the killer the AP of the killed
        targetGamePlayer.actions = 0
      }
      await targetGamePlayer.save()

      gp.actions -= 1
      await gp.save()

      move.targetGamePlayerId = targetGamePlayer.id
      await move.save()

      let shotMsg = "<@" + gp.PlayerId + "> **💥shot💥** <@" + targetGamePlayer.PlayerId + ">, reducing their health to **" + targetGamePlayer.health + "**!"
      if (targetGamePlayer.health == 0) {
        shotMsg = "<@" + gp.PlayerId + "> **☠️ ELIMINATED ☠️** <@" + targetGamePlayer.PlayerId + ">  and stole their AP!"
      }
      game.notify(shotMsg)

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

        game.notify("<@" + gp.PlayerId + "> **_WON THE GAME!!_**")

        //TODO: after action report
      }


      return res.send("Shot!")
    }

    return res.status(500).send("Not implemented")

  } catch (error) {
    return res.status(400).send("Action failed")
  }

})

// repeating check to see what games are due for an action point distro
setInterval(async () => {
  //console.log("Doing a tick scan")
  infightDB.sequelize.models.Game.tickGamesNeedingTick()
}, 1000 * 25) //how often to query for games that need AP distro

// repeating check to see what games are due to start
setInterval(async () => {
  //console.log("Doing a start scan")
  infightDB.sequelize.models.Game.startGamesNeedingToStart()
}, 1000 * 30) //how often to query for games that need AP distro

app.listen(port, () => {
  console.log(`Infight server listening on port ${port}`)
})