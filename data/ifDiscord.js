module.exports = function (db) {

    const { Client, Events, GatewayIntentBits, ChannelType } = require('discord.js');


    // Create a new client instance
    const client = new Client({ intents: [GatewayIntentBits.Guilds] });

    // When the client is ready, run this code (only once)
    // We use 'c' for the event parameter to keep it separate from the already defined 'client'
    client.once(Events.ClientReady, c => {
        console.log(`Ready! Logged in as ${c.user.tag}`);
    });

    //joined a server
    client.on(Events.GuildCreate, guild => {
        console.log("Joined a new guild: " + guild.name);
        const s = new db.Server({
            id: guild.id,
            name: guild.name,
            icon: guild.icon
        })
        s.save()

        guild.channels.create({
            name: "infight",
            type: ChannelType.GuildText
        }).then(channel => {
            s.gameChannelId = channel.id
            s.save()
            channel.send('Hiya guys!')
        })
    })

    //removed from a server
    client.on(Events.GuildDelete, guild => {
        console.log("Left a guild: " + guild.name);
        //remove from guildArray?
    })

    // Log in to Discord with your client's token
    client.login(process.env.DISCORD_TOKEN);

    return client
}