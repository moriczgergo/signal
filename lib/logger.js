module.exports = function initLogger(name) {
    return {
        log: x => x.split("\n").forEach(y => console.log("["+new Date().toISOString()+"] [LOG] [" + name + "] : " + y)),
        error: x => x.split("\n").forEach(y => console.error("["+new Date().toISOString()+"] [ERROR] [" + name + "] : " + y))
    }
}