var express = require('express');
var bodyParser = require('body-parser');
var nanoid = require('nanoid');
var bcrypt = require('bcrypt');
var RCP = require('express-recaptcha').RecaptchaV2;

module.exports = function authRouter(share) {
    var router = express.Router();

    router.use(bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));

    var recaptcha = process.env.RECAPTCHA_ENABLED == 1 ? null : new RCP(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY);

    var sendError = (res, status, code) => res.status(status).send({error: code});
    var onCatch = res => {
        return err => {
            console.error(err);
            sendError(res, 500, 0);
        }
    }

    var {Account, Token} = require('./mongoose');

    router.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "*")
        next();
    });

    router.post('/register.json', (process.env.RECAPTCHA_ENABLED == 1 ? recaptcha.middleware.verify : (req, res, next) => next()), function registerPost(req, res) {
        if (process.env.RECAPTCHA_ENABLED == 1){
            if (req.recaptcha.error) return sendError(res, 400, 1) // bad recaptcha
        }
        if (!req.body) return sendError(res, 400, 2) // bad body
        if (!req.body.username) return sendError(res, 400, 2) // bad body
        if (!req.body.password) return sendError(res, 400, 2) // bad body

        if (req.body.password.length < 8 || req.body.password.length > 128) return sendError(res, 400, 4) // password doesn't fit requirements
        if (!req.body.username.match(/^[a-zA-Z0-9_-]+$/) || req.body.username.length > 32 || req.body.username.length < 1) return sendError(res, 400, 5) // username doesn't fit requirements

        Account.findOne({ username: req.body.username }).then(doc => {
            if (doc) return sendError(res, 400, 3) // username already taken
            bcrypt.hash(req.body.password, 10, function(err, hash) {
                if (err) onCatch(res)(err);

                new Account({
                    username: req.body.username,
                    password: hash
                }).save(err => {
                    if (err) onCatch(res)(err);
                    res.status(200).json({});
                })
            });
        }).catch(onCatch(res));
    })

    router.post('/login.json', function loginPost(req, res) {
        if (!req.body) return sendError(res, 400, 2); // bad body
        if (!req.body.username) return sendError(res, 400, 2) // bad body
        if (!req.body.password) return sendError(res, 400, 2) // bad body

        Account.findOne({ username: req.body.username }).then(doc => {
            if (!doc) return sendError(res, 400, 3) // user does not exist
            
            bcrypt.compare(req.body.password, doc.password, (err, match) => {
                if (err) onCatch(res)(err);
                if (!match) return sendError(res, 400, 4) // password doesn't match

                var tok = nanoid(32);

                Token.deleteMany({account: doc._id}).then(() => { // delete old tokens
                    new Token({
                        token: tok,
                        account: doc._id
                    }).save(err => {
                        if (err) onCatch(res)(err);

                        res.status(200).json({ token: tok });
                    })
                }).catch(onCatch(res))
            })
        }).catch(onCatch(res));
    })

    router.get('/recaptcha.json', function rcpGet(req, res) {
        if (process.env.RECAPTCHA_ENABLED == 1) res.status(200).json({ site_key: process.env.RECAPTCHA_SITE_KEY });
        else res.status(404).json({});
    })

    return router;
}