const { Sequelize, DataTypes, Model } = require('sequelize')

module.exports = function (sequelize) {

    class Move extends Model {
        static describeMoveDirection(start, end) {
            const [y1, x1] = start;
            const [y2, x2] = end;
          
            const rowDiff = x2 - x1;
            const colDiff = y2 - y1;
          
            if (rowDiff === 0 && colDiff === 0) {
              return "No movement";
            }
          
            let direction = "";
          
            // Determine vertical movement
            if (rowDiff < 0) {
              direction += "up";
            } else if (rowDiff > 0) {
              direction += "down";
            }
          
            // Determine horizontal movement
            if (colDiff < 0) {
              direction += direction ? " and left" : "left";
            } else if (colDiff > 0) {
              direction += direction ? " and right" : "right";
            }
          
            return direction
          }

        static getRandomMovementDescriptionWithEmoji() {
            const movements = [
              { verb: "slid", emoji: "🛷", adverbs: ["gracefully", "smoothly", "awkwardly"] },
              { verb: "darted", emoji: "🏃", adverbs: ["hastily", "swiftly", "boldly"] },
              { verb: "glided", emoji: "🦅", adverbs: ["silently", "gracefully", "steadily"] },
              { verb: "charged", emoji: "🐂", adverbs: ["recklessly", "boldly", "bravely"] },
              { verb: "lurched", emoji: "🤖", adverbs: ["clumsily", "unexpectedly", "awkwardly"] },
              { verb: "crept", emoji: "🕵️", adverbs: ["sneakily", "patiently", "nervously"] },
              { verb: "leapt", emoji: "🦘", adverbs: ["bravely", "smoothly", "unexpectedly"] },
              { verb: "skipped", emoji: "💃", adverbs: ["happily", "clumsily", "lightly"] },
              { verb: "bounded", emoji: "🐇", adverbs: ["energetically", "bravely", "recklessly"] },
              { verb: "staggered", emoji: "🥴", adverbs: ["clumsily", "awkwardly", "steadily"] },
              { verb: "shuffled", emoji: "🧓", adverbs: ["patiently", "awkwardly", "silently"] },
              { verb: "sprinted", emoji: "⚡", adverbs: ["swiftly", "boldly", "hastily"] },
              { verb: "lunged", emoji: "🤺", adverbs: ["bravely", "recklessly", "unexpectedly"] },
              { verb: "ambled", emoji: "🚶", adverbs: ["calmly", "steadily", "patiently"] },
              { verb: "strode", emoji: "👣", adverbs: ["boldly", "smoothly", "gracefully"] },
              { verb: "tiptoed", emoji: "🐾", adverbs: ["sneakily", "silently", "nervously"] },
              { verb: "bolted", emoji: "🏇", adverbs: ["hastily", "swiftly", "recklessly"] },
              { verb: "inched", emoji: "🐛", adverbs: ["patiently", "awkwardly", "nervously"] }
            ];
          
            // Pick a random movement
            const randomMovement = movements[Math.floor(Math.random() * movements.length)];
          
            // Pick a random adverb for the selected movement
            const randomAdverb = randomMovement.adverbs[Math.floor(Math.random() * randomMovement.adverbs.length)];
          
            // Return the movement description with the emoji
            return `${randomMovement.emoji} ${randomMovement.verb} ${randomAdverb}`;
          }
    }

    // set up the Sequelize fields
    Move.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                allowNull: false,
                primaryKey: true
            },
            action: {
                type: DataTypes.STRING,
                allowNull: false
            },
            targetPositionX: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            targetPositionY: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
        },
        { sequelize }
    )

    return Move

}