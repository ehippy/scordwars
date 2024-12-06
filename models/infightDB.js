const { Entity, Service } = require("electrodb");

import DynamoDB from "aws-sdk/clients/dynamodb";

const client = new DynamoDB.DocumentClient();

// highlight-next-line
const table = "Infight";



// Players and Guilds represent peoples' Discord Accounts, Discord Guilds (servers), and their associations
const Player = new Entity(
    {
      model: {
        entity: "player",
        version: "1",
        service: "infight",
      },
      attributes: {
        playerId: {
          type: "string",
        },
        name: {
          type: "string",
          required: true,
        },
        avatar: {
            type: "string",
          required: true,
        },
      },
      indexes: {
        byId: {
          pk: {
            // highlight-next-line
            field: "pk",
            composite: ["playerId"],
          },
          sk: {
            // highlight-next-line
            field: "sk",
            composite: [],
          },
        }
      },
      // add your DocumentClient and TableName as a second parameter
    },
    { client, table },
  );

const Guild = require('./Guild')(sequelize)
const PlayerGuild = require('./PlayerGuild')(sequelize);
Guild.belongsToMany(Player, { through: PlayerGuild });
Player.belongsToMany(Guild, { through: PlayerGuild });

// Games and GamePlayers and Moves are the stuff of gameplay: board and pieces and moves
const Game = require('./Game')(sequelize)
Guild.hasMany(Game, {foreignKey: 'GuildId'})
Game.belongsTo(Guild, {foreignKey: 'GuildId'})

const GamePlayer = require('./GamePlayer')(sequelize)
Game.hasMany(GamePlayer)
GamePlayer.belongsTo(Game)

Player.hasMany(GamePlayer)
GamePlayer.belongsTo(Player)

const Move = require('./Move')(sequelize)
Game.hasMany(Move)
Move.belongsTo(Game)

GamePlayer.hasMany(Move, { as: 'ActingPlayer', foreignKey: 'actingGamePlayerId' })
GamePlayer.hasMany(Move, { as: 'TargetPlayer', foreignKey: 'targetGamePlayerId' })
Move.belongsTo(GamePlayer)

// Wrap it all together, connect to the db and sync tables
module.exports = {
    init: async function () {
        try {
            await sequelize.authenticate();
            console.log('Connection has been established successfully.');
        } catch (error) {
            console.error('Unable to connect to the database:', error);
        }

        console.log("Synchronizing db tables");
        await sequelize.sync({ alter: true });
        console.log("All tables were synchronized successfully.");
    },
    sequelize: sequelize,

    Player: Player,
    Guild: Guild,
    PlayerGuild: PlayerGuild,
    Game: Game,
    GamePlayer: GamePlayer,
    Move: Move
}
