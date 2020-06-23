const path = require('path');
const WorkerPlugin = require('worker-plugin');

module.exports = {
    mode: 'development',
    entry: './src/multi-barcode-scanner-js.ts',
    node: {
        fs: 'empty'
      },   
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'multi-barcode-scanner-js.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    plugins: [ 
        new WorkerPlugin()
    ]
};

