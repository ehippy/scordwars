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

const db = require("./data/db")

const infightDB = require('./data/infightDB')
infightDB.init()

const infightLogin = require("./auth/login")(app, settings, db)
const verifyToken = require("./auth/tokenAuthMiddleware")

const ifDisco = require('./data/ifDiscord')(db)


app.get('/', (req, res) => {
  console.log(ifDisco.guilds.cache)
  res.send('Hello from the infight api!')
})

app.get('/myTeams', verifyToken, (req, res) => {

  db.User.get(req.user.id, (error, myUser) => {
    if (error) {
      console.error(error);
      next(error)
    } else {
      console.log(myUser);
      if (myUser.id == req.user.id) {
        res.send(myUser.servers)
      } else {
        next(new Error("no matching user"))
      }
    }
  })
})


app.get('/server/:serverId', verifyToken, (req, res) => {

  db.Server.get(req.params.serverId, (error, myServer) => {
    if (error) {
      console.error(error);
      next(error)
    } else {
      console.log(myServer);
      if (myServer.id == req.params.serverId) {
        res.send(myServer)
      } else {
        next(new Error("no matching server"))
      }
    }
  })
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})