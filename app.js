require('dotenv').config()
const settings = {
  discord_oauth2_client_id: process.env.DISCORD_OAUTH2_CLIENT_ID,
  discord_oauth2_client_secret: process.env.DISCORD_OAUTH2_CLIENT_SECRET,
  discordCallbackURL: '/auth/discord/callback',
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
//db.init()

const infightLogin = require("./auth/login")(app, settings, db)
const verifyToken = require("./auth/tokenAuthMiddleware")
const disco = require("discord.js")

app.get('/', (req, res) => {
  res.send('Hello from the infight api!')
})

app.get('/myTeams', verifyToken, (req, res) => {

  db.User.get(req.user.id, (error, myUser) => {
    if (error) {
        console.error(error);
        throw new Error('Could not get teams')
    } else {
        console.log(myUser);
        res.send(myUser.servers)
    }
});

})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})