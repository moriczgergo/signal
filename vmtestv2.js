var fs = require('fs');
var path = require('path');
if (!process.argv.includes("-kid")) {
    var {spawn} = require('child_process');
    var nanoid = require('nanoid');

    console.log(`Master ${process.pid} is running.`)

    // Map variables
    var size = 10000;
    var grid = Array(size).fill(Array(size).fill(1));
    
    // Coordinate generation
    var genCoord = () => {
        var x = Math.floor(Math.random() * size);
        var y = Math.floor(Math.random() * size);
        return [x,y];
    }
    var genNotTaken = () => {
        var coord = genCoord();
        if (grid[coord[0]][coord[1]] == 0) return genNotTaken();
        return coord;
    }

    // Neighbour calculating
    var neighbours = (x,y) => {
        var ret = [];
    
        // West
        if (grid[x - 1] && grid[x - 1][y]) ret.push({
            x: x - 1,
            y,
            weight: grid[x - 1][y]
        });
    
        // East
        if (grid[x + 1] && grid[x + 1][y]) ret.push({
            x: x + 1,
            y,
            weight: grid[x + 1][y]
        });
    
        // South
        if (grid[x] && grid[x][y - 1]) ret.push({
            x,
            y: y - 1,
            weight: grid[x][y - 1]
        });
    
        // North
        if (grid[x] && grid[x][y + 1]) ret.push({
            x,
            y: y+1,
            weight: grid[x][y + 1]
        });
    
        return ret;
    }

    // Generate walls
    for (var i = 0; i < 2500; i++) {
        var loc = genNotTaken();
        grid[loc[0]][loc[1]] = 0;
    }

    console.log(`Map has been generated. (size: ${size})`);

    // Summoning runners
    var runners = [];

    for (var i = 0; i < 10; i++) {
        var id = nanoid(6);
        var runnerOutput = path.join(__dirname, "temp/", id + "_out.json");
        var runnerInput = path.join(__dirname, "temp/", id + "_in.json");
        fs.writeFileSync(runnerOutput, "", "utf8"); fs.writeFileSync(runnerInput, "", "utf8");

        var runner = spawn('node', [__filename, '-kid', runnerInput, runnerOutput]);

        runner.on('exit', function onRunnerExit(code, signal) {
            console.log(`Runner ${this} has exited. (${code},${signal})`);
            runners.splice(runners.findIndex(x => x.id == this), 1);
        }.bind(id))
        runner.stderr.on('data',function onRunnerError(message) {
            console.error(`Worker ${id} has logged an error: ` + message.toString("utf8"));
        }.bind(id))

        // Generate location for runners
        var loc = genNotTaken();
        grid[loc[0]][loc[1]] = 0;

        runners.push({ process: runner, loc, target: genNotTaken(), id, output: runnerOutput, input: runnerInput });
    }

    // Event Loop Accuracy Timer
    var elat = Date.now();
    setInterval(() => {
        var x = Date.now();
        console.log("ELAT: " + (x-elat-1000));
        elat = x;
    }, 1000);

    // Wave Summoner
    function wave() {
        console.log("Wave incoming...");
        runners.forEach(function forEachRunner(runner) { // For each runner...
            console.log(`Executing runner ${runner.id}`);
            fs.watchFile(runner.output, function onRunnerOutputWave() { // Stdout event
                var o = JSON.parse(fs.readFileSync(runner.output, "utf8"));

                if (o.type == "done") { // When submitting results
                    console.log(`Runner ${runner.id} has finished. ${o.result}`)
                    //fs.unwatchFile(runner.output);
                } else if (o.type == "neighbours") { // When asking for neighbours
                    console.log(`Runner ${runner.id} has requested neighbour information. (${o.x}, ${o.y})`)
                    var result = neighbours(o.x, o.y);
                    try {
                        fs.writeFileSync(runner.input, JSON.stringify({
                            type: "neighbours",
                            result
                        }), "utf8");
                    } catch (e) {
                        console.error(`Couldn't send neighbour data to runner ${runner.id} :()`);
                    }
                }
            })

            fs.writeFileSync(runner.input, JSON.stringify({ // Send execute signal
                type: "execute",
                target: runner.target,
                loc: runner.loc
            }), "utf8")
        })
    }

    setTimeout(wave, 5000);
} else {
    var {VM} = require('vm2');
    var astar = fs.readFileSync(require.resolve('./astar', "utf8"));
    var deasync = require('deasync');

    function pathfind() {
        var graph = new Graph();
        var start = new GridNode(loc[0], loc[1], 0);
        var end = new GridNode(target[0], target[1], 0);
        var result = astar.search(graph, start, end);
        submit(result);
    }

    var neighbourData = null;

    fs.watch(process.argv[3], async function onData(e, filename) {
        var ip = fs.readFileSync(process.argv[3], "utf8").trim();
        var o = JSON.parse(ip);

        if (o.type == "neighbours") {
            neighbourData = o.result;
            return;
        }
        if (o.type != "execute") return;
        console.error("gottem")

        setImmediate(function executeCode() {
            var vm = new VM({
                sandbox: {
                    Proxy: undefined, require: undefined, setInterval: undefined, setTimeout: undefined, setImmediate: undefined, clearInterval: undefined, clearTimeout: undefined, clearImmediate: undefined,
                    getNeighbours: (x, y) => {
                        neighbourData = null;
                        fs.writeFileSync(process.argv[4], JSON.stringify({
                            type: "neighbours",
                            x,
                            y
                        }), "utf8");

                        deasync.loopWhile(() => neighbourData == null);
                        return neighbourData;
                    },
                    submit: result => {
                        fs.writeFileSync(process.argv[4], JSON.stringify({
                            type: "done",
                            result
                        }), "utf8");

                        return;
                    },
                    loc: o.loc,
                    target: o.target
                },
                timeout: 750
            });
            
            setImmediate(() => {
                vm.run(astar);
                vm.run('new ' + pathfind);
            })
        });
    });
}