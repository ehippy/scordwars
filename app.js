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
const port = 3000

const db = require("./db")
db.init()

const infightLogin = require("./login")(app, settings, db)
const disco = require("discord.js")

app.get('/', (req, res) => {
  res.send('Hello from the infight api!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})