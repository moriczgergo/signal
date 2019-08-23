if (process.argv.includes("-kid")) {
    var {spawn} = require('child_process');

    console.log(`Master ${process.pid} is running`);

    var size = 10000;
    var grid = Array(size).fill(Array(size).fill(1)); // 1 = free
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

    for (var i = 0; i < 2500; i++) {
        var loc = genNotTaken();
        grid[loc[0]][loc[1]] = 0; // 0 = wall
    }

    console.log("walls have been generated");

    var vms = [];

    for (var i = 0; i < 1; i++) {
        var vm = spawn('node', [__filename, '-kid'])

        vm.on("exit", () => console.error("Worker died"));

        var at = genNotTaken();
        grid[at[0]][at[1]] = 0;
        vms.push({worker: vm, target: genNotTaken(), at, output: });
    }

    var last = Date.now();
    setInterval(() => {
        var x = Date.now();
        console.log(x - last);
        last = x;
    }, 1000)

    var makeVM = vm => new Promise(() => {
        function ls(message) {
            var o = JSON.parse(message.toString("utf8"));

            if (o.type == "done") {
                vm.worker.stdout.removeAllListeners();
                console.log(`Worker ${vm.proc.pid} finished (${JSON.stringify(o)})`);
                Promise.resolve();
            } else if (o.type == "neighbour") {
                var res = neighbours(o.x, o.y);
                vm.worker.stdout.send(JSON.stringify({
                    type: "neighbour",
                    res
                }), err => {
                    if (err) {
                        throw err;
                    }
                    console.log("neighbourrr")
                })
            }
        }
        vm.worker.stdout.on('data', ls)
        vm.worker.stdout.write(JSON.stringify({
            type: "wave",
            target: vm.target,
            at: vm.at
        }));
    })
    

    var wave = () => {
        console.log("WAVE");
        for (var i = 0; i < vms.length; i++) makeVM(vms[i]);
    }

    setTimeout(wave, 1000)
    //wave();
} else {
    var {VM} = require('vm2');
    var astar = fs.readFileSync(require.resolve('./astar'), "utf8");
    var deasync = require('deasync');
    var nbdat = null;

    function pf() {
        var graph = new Graph();
        var start = new GridNode(at[0], at[1], 0);
        var end = new GridNode(target[0], target[1], 0);
        var result = astar.search(graph, start, end);
        submit(result);
    }

    fs.watch(process.argv[3], (e, filename) => {
        //if (!message.includes("START")) return;

        var o = JSON.parse(fs.readFileSync(filename, "utf8"));

        if (o.type == "neighbour" && !o.tom) {
            nbdat = o.res;
            return;   
        }
        if (o.type != "wave") return;

        setImmediate(() => {
            var isolate = new VM({ sandbox: {
                Proxy: undefined, require: undefined, setInterval: undefined, setTimeout: undefined, setImmediate: undefined, clearInterval: undefined, clearTimeout: undefined, clearImmediate: undefined,
                _neighbours: (x,y) => {
                    Object.values(cluster.workers).forEach(w => w.send(JSON.stringify({
                        type: "neighbour",
                        x,
                        y,
                        tom: true
                    })));

                    deasync.loopWhile(x => nbdat == null);
                    var dat = JSON.parse(JSON.stringify(nbdat));
                    nbdat = null;
                    return dat;
                },
                target: o.target,
                at: o.at,
                submit: res => {
                    Object.values(cluster.workers).forEach(w => w.send(JSON.stringify({ type: "done", res })));
                }
            }, timeout: 750 });

            isolate.run(astar);
            var done = false;
            setImmediate(() => {
                isolate.run('new ' + pf);
                done = true
            });

            deasync.loopWhile(x => !done)
        })
    });
}