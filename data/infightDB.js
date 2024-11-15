const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = new Sequelize(process.env.POSTGRES_CONN, {
    logging: false
})

const Player = sequelize.define('Player', {
    id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    discriminator: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatar: {
        type: DataTypes.STRING
    }
})

const Guild = sequelize.define('Guild', {
    id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    icon: {
        type: DataTypes.STRING
    },
    isConnected: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
    },
    gameChannelId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    currentGameId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
})

const PlayerGuild = sequelize.define('PlayerGuilds', {
    GuildId: {
        type: DataTypes.STRING,
        references: {
            model: Guild,
            key: 'id'
        }
    },
    PlayerId: {
        type: DataTypes.STRING,
        references: {
            model: Player,
            key: 'id'
        }
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isOptedInToPlay: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});
Guild.belongsToMany(Player, { through: PlayerGuild });
Player.belongsToMany(Guild, { through: PlayerGuild });

const Game = sequelize.define('Game', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'new'
    },
    musterTime: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    minutesPerActionDistro: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60*12
    },
    boardWidth: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20
    },
    boardHeight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20
    },
    winningPlayer: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60*12
    }
})
Guild.hasMany(Game)
Game.belongsTo(Guild)


const GamePlayer = sequelize.define('GamePlayer', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'alive'
    },
    health: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3
    },
    actions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    range: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    positionX: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    positionY: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
})

Game.hasMany(GamePlayer)
GamePlayer.belongsTo(Game)

Player.hasMany(GamePlayer)
GamePlayer.belongsTo(Player)


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
    Player: Player,
    Guild: Guild,
    PlayerGuild: PlayerGuild,
    Game: Game,
    GamePlayer: GamePlayer
}
