require('dotenv').config()
const settings = {
  discord_oauth2_client_id: process.env.DISCORD_OAUTH2_CLIENT_ID,
  discord_oauth2_client_secret: process.env.DISCORD_OAUTH2_CLIENT_SECRET,
  discordCallbackURL: '/auth/discord/callback',
  discordToken: process.env.DISCORD_TOKEN,
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

  // db.User.get(req.user.id, (error, myUser) => {
  //   if (error) {
  //     console.error(error);
  //     next(error)
  //   } else {
  //     console.log(myUser);
  //     if (myUser.id == req.user.id) {
  //       res.send(myUser.servers)
  //     } else {
  //       next(new Error("no matching user"))
  //     }
  //   }
  // })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})