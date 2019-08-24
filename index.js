// TO-DO: IMPROVE ERROR HANDLING
require('dotenv').config();
var Express = require('express'); // Webserver
var bodyParser = require('body-parser'); // POST parser for webserver
var nanoid = require('nanoid'); // ID/Token generator
var mongoose = require('mongoose'); // Database

var app = Express();
var ews = require('express-ws')(app);
mongoose.connect(process.env.MONGODB, {useNewUrlParser: true});

var share = {mongoose, ews}

app.use('/chat', require('./lib/chat')(share)); // /chat WS endpoint
app.use('/auth', require('./lib/auth')(share)); // auth api
app.use('/game', require('./lib/game')(share)); // auth api

app.get('/', function serveIndex(req, res) {
	res.send("<h1>You're lost.</h1><p>Hey! This is a Signal server's address. You're probably looking to go <a href=\"https://signal.skiilaa.me/game?host=todo\">here</a>.</p>"); // TO-DO: put server address into host query param so the client knows where to point
});

app.listen(process.env.PORT, function listening() {
	console.log("Listening on port " + process.env.PORT);
})