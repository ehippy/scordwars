const dynamoose = require("dynamoose")

ifDB = dynamoose.aws.ddb.local("http://localhost:8080");

const UserServer = new dynamoose.Schema({
    "id": Number,
    "name": String,
    "icon": String,
    "owner": Boolean,
    "permissions": Number
})

const User = dynamoose.model("User", new dynamoose.Schema({
    "id": Number,
    "name": String,
    "discriminator": Number,
    "servers": {
        "type": Array,
        "schema": [UserServer]
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
    //UserTable.initialize()
}

const infightData = {
    dynamoose: ifDB,
    user: User,
    init: init
}

module.exports = infightData