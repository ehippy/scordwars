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
    if (!boardSize || isNaN(boardSize) || boardSize < 10 || boardSize > 100) {
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

    const playerCreateResult = await infightDB.GamePlayer.bulkCreate(GamePlayersToCreate, { transaction: t, validate:true })

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

  const game = await infightDB.Game.findByPk(req.params.gameId, { include: { all: true } });
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



// Endpoints needed
// Games: Create, Get
// Moves: Create

// How to run the game CRON?

app.listen(port, () => {
  console.log(`Infight server listening on port ${port}`)
})