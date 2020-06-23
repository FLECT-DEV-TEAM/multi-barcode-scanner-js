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


// copy multi-barcode-scanner(1)
package_name = 'multi-barcode-scanner-js'
src = path.join('node_modules', package_name, 'dist', '0.multi-barcode-scanner-js.worker.js')
dst = path.join(process.argv[2], '0.multi-barcode-scanner-js.worker.js')

try {
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
    console.log('file is copied');
  } catch (error) {
    console.log(error);
  }

// copy multi-barcode-scanner(2)
package_name = 'multi-barcode-scanner-js'
src = path.join('node_modules', package_name, 'dist', 'zxing.wasm')
dst = path.join(process.argv[2], 'zxing.wasm')

try {
    fs.copyFileSync(src, dst, fs.constants.COPYFILE_EXCL);
    console.log('file is copied');
  } catch (error) {
    console.log(error);
  }
