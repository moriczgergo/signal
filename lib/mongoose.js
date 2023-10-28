var mongoose = require('mongoose');

module.exports = {
    Account: mongoose.model('Account', { username: {type: String, index: true}, password: String, users: { type: [String] }, last_login: Number }),
    User: mongoose.model('User', { username: {type: String, index: true}, balance: {type: Number, default: 0}, inventory: {type: Array, default: []} }), // TO-DO: give better array description in future
    Token: mongoose.model('Token', {token: {type: String, index: true}, account: mongoose.Schema.Types.ObjectId}),
    Map: mongoose.model('Map', {grid: Array})
}