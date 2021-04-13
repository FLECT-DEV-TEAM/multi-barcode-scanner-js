const path = require('path');
// const WorkerPlugin = require('worker-plugin');

const worker = {
    mode: 'development',
    entry: './src/workerCV.ts', // <-- (1)
    resolve: {
        extensions: [".ts", ".js"],
        fallback:{
            "path":false,
            "crypto":false,
            "fs":false
        }
    },
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
        ],
    },
    output: {
        filename: 'workerCV.js', // <-- (2)
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        globalObject: 'typeof self !== \'undefined\' ? self : this'
    },
    // plugins: [　　　　　　　　　　　　　　　　 // <--- (3)
    //     new WorkerPlugin()
    // ]
};



const manager = {
    mode: 'development',
    entry: './src/multi-barcode-scanner-js.ts',
    resolve: {
        extensions: [".ts", ".js"],
        fallback:{
            "path":false,
            "crypto":false,
            "fs":false
        }
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
    // plugins: [ 
    //     new WorkerPlugin()
    // ]
};


module.exports = [
    manager, worker
]


