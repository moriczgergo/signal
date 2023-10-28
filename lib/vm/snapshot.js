var ivm = require('isolated-vm');
var path = require('path');
var fs = require('fs');

var warmups = ['./warmup/arrayfix.js'];
warmups = warmups.map(x => require.resolve(x)).map(x => {
    return {
        code: fs.readFileSync(x, 'utf8'),
        filename: path.basename(x)
    };
});

module.exports = ivm.Isolate.createSnapshot([...warmups]);