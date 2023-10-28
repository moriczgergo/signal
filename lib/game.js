var express = require('express');
var nanoid = require('nanoid');
var {Account, Token, User} = require('./mongoose');
var logger = require('./logger')("GWS");
var config = require('./config');

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

    var checkUserAcct = (acct, user) => new Promise(() => {
        Account.findById(acct).then(accdoc => {
            if (!accdoc) return Promise.reject("Account for " + doc.account + " not found...");
            Promise.resolve(accdoc.users.includes(user));
        }).catch(Promise.reject)
    });

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

            if (o.type == "acct.auth") {
                if (!o.token) return errorWs(ws, 1, false, 1003, "Bad message");

                Token.findOne({ token: o.token }).then(doc => {
                    if (!doc) return errorWs(ws, 2, true, 1003, "Invalid token");

                    sessions.find(x => x.id == id).auth = o.token;
                    sessions.find(x => x.id == id).account = doc.account;

                    Account.findById(doc.account).then(accdoc => {
                        if (!accdoc) return throwWs(ws)("Account for " + doc.account + " not found...");
                        ws.send(config.acctDataMessage(accdoc));
                    }).catch(throwWs(ws));
                }).catch(throwWs(ws))
            } else if (o.type == "acct.data") {
                if (!sessions.find(x => x.id == id).auth) return error(ws, 3, false); // unauthorized

                Account.findById(sessions.find(x => x.id == id).account).then(accdoc => {
                    if (!accdoc) return throwWs(ws)("Account for " + doc.account + " not found...");
                    ws.send(config.acctDataMessage(accdoc));
                }).catch(throwWs(ws))
            } else if (o.type == "user.data") {
                if (!sessions.find(x => x.id == id).auth) return error(ws, 3, false); // unauthorized
                if (!o.user) return errorWs(ws, 1, false, 1003, "Bad message");
                
                var acctID = session.find(x => x.id == id).acct;
                checkUserAcct(acctID, o.user).then(belongs => {
                    if (!belongs) return error(ws, 4, false) // specified user doesnt belong to you

                    User.findOne({ username: o.user }).then(doc => {
                        if (!doc) return throwWs(ws)(o.user + " who's specified in " + acctID + "'s users list does not have a User record???");

                        ws.send(config.userDataMessage(doc));
                    }).catch(throwWs(ws))
                }).catch(throwWs(ws))
            }
        })

        ws.send(JSON.stringify({
            type: "hello"
        })) // send initial message
    });

    return router;
}