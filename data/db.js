const dynamoose = require("dynamoose")

//TODO: real dynamo config
ifDB = dynamoose.aws.ddb.local("http://localhost:8080");

const User = dynamoose.model("User", new dynamoose.Schema({
    "id": String,
    "name": String,
    "discriminator": String,
    "servers": {
        "type": Array,
        "schema": [
            new dynamoose.Schema({
                "id": String,
                "name": String,
                // "icon": String, /
                "owner": Boolean,
                "permissions": String
            })
        ]
    },
    "avatar": String,
    "email": String,
    "AccessToken": String,
    "RefreshToken": String
}, {
    "saveUnknown": true,
    "timestamps": true
}));
const UserTable = new dynamoose.Table("User", [User]);

const init = () => {
    UserTable.initialize()
}

const infightData = {
    dynamoose: ifDB,
    User: User,
    UserTable: UserTable,
    init: init
}

module.exports = infightData