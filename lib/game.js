var express = require('express');
var nanoid = require('nanoid');
var {Account, Token, User} = require('./mongoose');
var logger = require('./logger')("GWS");

module.exports = function gameRouter() {
    var router = express.Router();

    var tryJSON = x => {try{JSON.parse(x);return true;}catch(e){return false;}} // check JSON validity
    var errorWs = (ws, code, close, reason, msg) => { // send WS error for chat, optionally close connection
        ws.send(JSON.stringify({
            type: "error",
            code: code
        }));
        if (close) ws.close(reason, msg); // close conn
    }
    var throwWs = ws => {
        return e => {
            logger.error(e);
            errorWs(ws, 0, true, 1011, "Internal Server Error")
        }
    }

    var sessions = [];
    
    router.ws('/', function onWSConnect(ws, req) {
        var id = nanoid();
        sessions.push({
            ws,
            id,
            auth: null,
            account: null
        });

        ws.on('close', function onWSClose(code, reason) {
            logger.log("Connection with " + id + " closed: " + code + ", " + reason);
            sessions.splice(sessions.findIndex(x => x.id == id), 1);
        });

        ws.on('message', function onWSMessage(msg) {
            if (!tryJSON(msg)) return errorWs(ws, 1, true, 1003, "Bad message"); // close conn if bad json

            var o = JSON.parse(msg);

            if (!o.type) return errorWs(ws, 1, false, 1003, "Bad message");

            if (o.type == "auth") {
                if (!o.token) return errorWs(ws, 1, false, 1003, "Bad message");

                Token.findOne({ token: o.token }).then(doc => {
                    if (!doc) return errorWs(ws, 2, true, 1003, "Invalid token");

                    sessions.find(x => x.id == id).auth = o.token;
                    sessions.find(x => x.id == id).account = doc.account;

                    Account.findById(doc.account).then(accdoc => {

                    });
                }).catch(throwWs(ws))
            }
        })

        ws.send(JSON.stringify({
            type: "hello"
        })) // send initial message
    });
}