const Game = require('./Game')
const GamePlayer = require('./GamePlayer')

module.exports = {
    Stats: {

        increment: (entity, stat, doSave = false) =>{
            if (!entity.stats[stat]) {
                entity.stats[stat] = 0
            }
            entity.stats[stat]++
            entity.changed('stats', true); // deep change operations in a json field aren't automatically detected by sequelize
    
            if (doSave) entity.save()
        },
    
        sumManyEntitysStats: (entityArray) => {
            const combinedStats = {}
            entityArray.forEach(entity => {
                for (const [key, value] of Object.entries(entity.stats)) {
                    if (!combinedStats[key]) {
                        combinedStats[key] = 0;
                    }
                    combinedStats[key] += value;
                }
            })
            return combinedStats;
        },

        GameStats: {},
        GamePlayerStats: {
            killedSomeone: 'killedSomeone',
            wasKilled: 'wasKilled',
            shotSomeone: 'shotSomeone',
            wasShot: 'wasShot',
            walked: 'walked',
            gaveAp: 'gaveAp',
            wasGiftedAp: 'wasGiftedAp',
            gaveHp: 'gaveHp',
            gotHp: 'gotHp',
            pickedUpHp: 'pickedUpHp',
            upgradedRange: 'upgradedRange',
            healed: 'healed',
            wasTreated: 'wasTreated',
            castVote: 'castVote',
            receivedVote: 'receivedVote',
            resurrectee: 'resurrectee',
            resurrector: 'resurrector',
            zapped: 'zapped',
            startFire: 'startFire'
        }
    }
}

