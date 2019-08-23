// TO-DO: IMPROVE ERROR HANDLING
require('dotenv').config();
var vm = require('vm2'); // VM for running machine code
var Express = require('express'); // Webserver
var bodyParser = require('body-parser'); // POST parser for webserver
var nanoid = require('nanoid'); // ID/Token generator
var mongoose = require('mongoose'); // Database
var deasync = require('deasync'); // Async non-blocking wait

var app = Express();
var ews = require('express-ws')(app);
mongoose.connect(process.env.MONGODB, {useNewUrlParser: true});

var tryJSON = x => {try{JSON.parse(x);return true;}catch(e){return false;}} // check JSON validity
var errorWs = (ws, code, close, reason, msg) => { // send WS error for chat, optionally close connection
	ws.send(JSON.stringify({
		type: "error",
		code: code
	}));
	if (close) ws.close(reason, msg); // close conn
}

var Account = mongoose.model('Account', { password: String, salt: String, users: [String] });
var User = mongoose.model('User', {name: {type: String, index: true}, balance: Number, upgrades: Array}); // TO-DO: give better array description in future
var Token = mongoose.model('Token', {token: {type: String, index: true}, account: mongoose.Schema.Types.ObjectId});

var chatClients = [];
var authCheckInterval = setInterval(function authCheck() { // check if logged-in chat tokens still exist or not
	console.log("Running auth check...");
	var i = 0;
	chatClients.filter(x => x.auth).forEach(client => {
		var authCheckDone = false;
		Token.findOne({ token: client.auth }).then(doc => {
			if (!doc) {
				i++;
				client.auth = null;
				client.account = null;
			}
			authCheckDone = true;
		}).catch(console.error);
		deasync.loopWhile(x => !authCheckDone);
	})
	console.log("Auth check kicked " + i + " players from chat.");
}, 60*1000)

app.ws('/chat', function onWSConnect(ws, req) {
	var id = nanoid();
	chatClients.push({
		ws,
		id,
		auth: null,
		account: null
	});

	ws.on('close', function onWSClose(code, reason) {
		console.log("Connection with " + id + " closed: " + code + ", " + reason);
		chatClients.splice(chatClients.findIndex(x => x.id == id), 1);
	});

	ws.on('message', function onWSMessage(msg) {
		if (!tryJSON(msg)) return errorWs(ws, 2, true, 1003, "Bad message"); // close conn if bad json

		var o = JSON.parse(msg);

		if (!o.type) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no type in message

		if (o.type == "hello") {
			if (!o.token) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no token in hello message

			Token.findOne({ token: o.token }).then(doc => {
				if (!doc) return errorWs(ws, 1, true, 1003, "Invalid token"); // send erorr if token is not found in database
				
				chatClients.find(x => x.id == id).auth = o.token;
				chatClients.find(x => x.id == id).account = doc.account;
			}).catch(console.error)
		} else if (o.type == "send") {
			if (!chatClients.find(x => id == x.id).auth) return errorWs(ws, 3, false); // send error if client isnt authed
			if (!o.author) return errorWs(ws, 2, false); // send error if no author in message
			if (!o.channel) return errorWs(ws, 2, false); // send error if no channel in message
			if (o.private === undefined) return errorWs(ws, 2, false); // send error if no private in message
			if (!o.content) return errorWs(ws, 2, false); // send error if no content in message
			if (!o.timestamp) return errorWs(ws, 2, false); // send error if no timestamp in message 

			Token.findOne({ token: chatClients.find(x => id == x.id ).auth }).then(doc => {

				if (!doc) {
					console.log("sendmsg auth check kicked " + id + " from chat.");
					return errorWs(ws, 4, true, 1003, "Token doesn't exist anymore.");
				}

				Account.findById(doc.account).then(accdoc => {

					if (!accdoc) {
						console.log("connection " + id + " used a token not belonging to an account");
						return errorWs(ws, 1, true, 1003, "Invalid token");
					}

					if (!accdoc.users.includes(o.author)) {
						console.log("connection " + id + " tried sending as " + o.author);
						return errorWs(ws, 5, false); // user does not belong to you
					}

					// TO-DO: verify channel existence
			
					if (o.private) {
						console.log(o.channel);
						Account.find({}).then(console.log)
						Account.findOne({ users: o.channel }).then(tardoc => {
							console.log(tardoc);
							if (!tardoc) {
								return errorWs(ws, 6, false); // user doesn't exist
							}

							var targetClient = chatClients.find(x => x.account == tardoc.id);
							if (!targetClient) {
								return errorWs(ws, 7, false); // user not online
							}

							targetClient.ws.send(JSON.stringify({
								type: "msg",
								author: o.author,
								channel: o.channel,
								content: o.content,
								timestamp: o.timestamp
							}));
						}).catch(console.error)
					} else {
						chatClients.filter(x => x.auth && x.id != id).forEach(function broadcastChat(client){
							client.ws.send(JSON.stringify({
								type: "msg",
								author: o.author,
								channel: o.channel,
								content: o.content,
								timestamp: o.timestamp
							}));
						})
					}
				}).catch(console.error)
			}).catch(console.error)
		}
	})

	ws.send(JSON.stringify({ type: "hello" })); // send initial hello message
});

app.get('/', function serveIndex(req, res) {
	res.send("<h1>You're lost.</h1><p>Hey! This is a Signal server's address. You're probably looking to go <a href=\"https://signal.skiilaa.me/game?host=todo\">here</a>.</p>"); // TO-DO: put server address into host query param so the client knows where to point
});

app.listen(process.env.PORT, function listening() {
	console.log("Listening on port " + process.env.PORT);
})
