const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = new Sequelize(process.env.POSTGRES_CONN)

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
    icon: {
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
        allowNull: false,
        defaultValue: false
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
    }
});
Guild.belongsToMany(Player, { through: PlayerGuild });
Player.belongsToMany(Guild, { through: PlayerGuild });

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
    Guild: Guild
}
