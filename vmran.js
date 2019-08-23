"use strict";
const {VM} = require('vm2');
var st = Date.now();
var isolate = new VM({ sandbox: {Proxy: undefined, require: undefined, setInterval: undefined, setTimeout: undefined, setImmediate: undefined, clearInterval: undefined, clearTimeout: undefined, clearImmediate: undefined}, timeout: 750 });
console.log(Date.now() - st)

module.exports = isolate.run('var x = 4;');