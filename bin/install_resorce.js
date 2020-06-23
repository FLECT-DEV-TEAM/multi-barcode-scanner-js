const fs = require('fs');
const path = require('path');

// copy scalable-semantic-segmentation-js
let package_name = 'scalable-semantic-segmentation-js'
let src = path.join('node_modules', package_name, 'dist', '0.scalable-semantic-segmentation.worker.js')
let dst = path.join(process.argv[2], '0.scalable-semantic-segmentation.worker.js')

try {
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
    console.log('file is copied');
} catch (error) {
    console.log(error);
}


// copy multi-barcode-scanner(1) : worker
package_name = 'multi-barcode-scanner-js'
src = path.join('node_modules', package_name, 'dist', '0.multi-barcode-scanner-js.worker.js')
dst = path.join(process.argv[2], '0.multi-barcode-scanner-js.worker.js')

try {
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
    console.log('file is copied');
} catch (error) {
    console.log(error);
}

// copy multi-barcode-scanner(2) : zxing
package_name = 'multi-barcode-scanner-js'
src = path.join('node_modules', package_name, 'dist', 'zxing.wasm')
dst = path.join(process.argv[2], 'zxing.wasm')

try {
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
    console.log('file is copied');
} catch (error) {
    console.log(error);
}

// copy multi-barcode-scanner(3) : model1
dst_dir = path.join(process.argv[2], 'multi-barcode-scanner-js-model')
src = path.join('node_modules', package_name, 'dist', 'multi-barcode-scanner-js-model', 'model.json')
dst = path.join(dst_dir, 'model.json')
try {
  fs.mkdirSync(dst_dir);
  fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
  console.log('file is copied');
} catch (error) {
  console.log(error);
}

// copy multi-barcode-scanner(4) : model2
dst_dir = path.join(process.argv[2], 'multi-barcode-scanner-js-model')
src = path.join('node_modules', package_name, 'dist', 'multi-barcode-scanner-js-model', 'group1-shard1of1.bin')
dst = path.join(dst_dir, 'group1-shard1of1.bin')
try {
  fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
  console.log('file is copied');
} catch (error) {
  console.log(error);
}
