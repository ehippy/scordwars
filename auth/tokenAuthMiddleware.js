const jwt = require("jsonwebtoken");
const db = require("../models/infightDB")

const verifyToken = (req, res, next) => {
    if (req.headers && req.headers.authorization) {
        jwt.verify(req.headers.authorization, process.env.SESSION_SECRET, function (err, decoded) {
            
            console.log("token middleware jwt:", decoded)

            if (err) {
                console.log("JWT auth error", error)
                res.send(403,"You do not have rights to visit this page");
            }
            req.user = decoded
            //TODO: verify user against database to check for bans?
            next()
        });
    } else {
        res.send(403,"You do not have rights to visit this page");
        next()
    }
};
module.exports = verifyToken;