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
  const player = await infightDB.Player.findByPk(req.user.id)
  if (player === null) {
    res.send(new Error("User not logged in", { statusCode: 404 }))
    next()
  }

  //check if we got a good id
  if (!req.params.teamId) {
    res.send(new Error("Invalid teamId", { statusCode: 404 }))
    next()
  }

  // check if there's an active game
  const g = await infightDB.Guild.findByPk(req.params.teamId);
  if (g === null) {
    res.send(new Error("Invalid teamId", { statusCode: 404 }))
    next()
  }

  if (g.currentGameId) {
    res.send(new Error("Already a game in progress", { statusCode: 409 }))
    next()
  }

  // check to make sure the user is a member of the server
  const matchingGuilds = await infightDB.PlayerGuild.findAndCountAll({
    where: {
      PlayerId: player.id,
      GuildId: req.params.teamId
    }
  })
  if (matchingGuilds.count == 0) {
    res.send(new Error("Player not a member of that team", { statusCode: 409 }))
    next()
  }

  // check for input size, cycle time, 
  const cycleHours = req.body.cycleHours;
  if (!cycleHours || isNaN(cycleHours) || cycleHours < 1 || cycleHours > 24) {
    res.send(new Error("cycleHours is not valid", { statusCode: 400 }))
    next()
  }

  const boardSize = req.body.boardSize;
  if (!boardSize || isNaN(boardSize) || boardSize < 10 || boardSize > 100) {
    res.send(new Error("boardSize is not valid", { statusCode: 400 }))
    next()
  }

  // get all the relevant active players...?

  // create the game
  const game = infightDB.Game.build({
    minutesPerActionDistro: cycleHours+60,
    boardWidth: boardSize,
    boardHeight: boardSize,
    guildId: req.params.teamId,

  });

  await game.save()
  console.log('created game ' + game.id)
  // send some hype abouut the muster period)

  res.send(game)
})

// Endpoints needed
// Games: Create, Get
// Moves: Create

// How to run the game CRON?

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})