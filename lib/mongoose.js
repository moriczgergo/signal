var mongoose = require('mongoose');

module.exports = {
    Account: mongoose.model('Account', { username: {type: String, index: true}, password: String, users: { type: [String] }, last_login: Number }),
    User: mongoose.model('User', {name: {type: String, index: true}, balance: Number, upgrades: Array}), // TO-DO: give better array description in future
    Token: mongoose.model('Token', {token: {type: String, index: true}, account: mongoose.Schema.Types.ObjectId}),
}