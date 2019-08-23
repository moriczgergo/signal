require('dotenv').config();
var vm = require('vm2'); // VM for running machine code
var Express = require('express'); // Webserver
var bodyParser = require('body-parser'); // POST parser for webserver
var nanoid = require('nanoid'); // ID/Token generator

var app = Express();
var ews = require('express-ws')(app);

var tryJSON = x => {try{JSON.parse(x);return true;}catch(e){return false;}} // check JSON validity
var errorWs = (ws, code, close, reason, msg) => { // send WS error for chat, optionally close connection
	ws.send(JSON.stringify({
		type: "error",
		code: code
	}));
	if (close) ws.close(reason, msg); // close conn
}

var chatClients = [];
app.ws('/chat', function onWSConnect(ws, req) {
	var id = nanoid();
	chatClients.push({
		ws,
		id,
		auth: null
	});

	ws.on('message', function onWSMessage(msg) {
		if (!tryJSON(msg)) return errorWs(ws, 2, true, 1003, "Bad message"); // close conn if bad json

		var o = JSON.parse(msg);

		if (!o.type) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no type in message

		if (o.type == "hello") {
			if (!o.token) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no token in hello message

			// TO-DO: VERIFY TOKEN, SEND ERROR IF BAD AUTH

			chatClients.find(x => x.id == id).auth = o.token;
		} else if (o.type == "send") {
			if (!chatClients.find(x => id == x.id).auth) return errorWs(ws, 3, false, 1002, "Unauthorized"); // send error if client isnt authed
			if (!o.author) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no author in message
			if (!o.channel) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no channel in message
			if (o.private === undefined) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no private in message
			if (!o.content) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no content in message
			if (!o.timestamp) return errorWs(ws, 2, false, 1003, "Bad message"); // send error if no timestamp in message 
			
			// TO-DO: verify channel existence, verify author based on token
			
			if (o.private) {
				// TO-DO: find user based on token, pick that token out of chatClients array, send message
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
