import { WorkerCommand, WorkerResponse } from "./const";
import { AIConfig } from "./const";


const ctx: Worker = self as any  // eslint-disable-line no-restricted-globals


//////////////////
/// WASM LOAD  ///
//////////////////
let init_zxing = false
let init_cv = false

const cv_asm = require('../resources/opencv.js');
const zxing_asm = require('../resources/zxing')

cv_asm.onRuntimeInitialized = function () {
  console.log("initialized cv_asm")
  init_cv = true
  initializationReport()
}
zxing_asm.onRuntimeInitialized = function () {
  console.log("initialized zxing_asm")
  init_zxing = true
  initializationReport()
}

export const initializationReport = () => {
  if (init_zxing === true && init_cv === true) {
    ctx.postMessage({ message: WorkerResponse.INITIALIZED })
  }
}

let decodePtr: any = null
let decodeCallback: any = null
let barcode: string | void | null = ""

    // @ts-ignore
const barcodeDetector = new BarcodeDetector({
  formats: [
    'ean_13',
  ]
});


//decodeCallback = function (ptr: any, len: any, resultIndex: any, resultCount: any) {
decodeCallback = function (ptr: any, len: any, resultIndex: any, resultCount: any,
  x0: any, y0: any, x1: any, y1: any, x2: any, y2: any, x3: any, y3: any, ) {
  const result = new Uint8Array(zxing_asm.HEAPU8.buffer, ptr, len);
  barcode = String.fromCharCode.apply(null, Array.from(result));
  // console.log("BARCODE_dETECT:", barcode, resultIndex, resultCount)
  // console.log("BARCODE_dETECT:", x0, y0, x1, y1, x2, y2, x3, y3)
};
decodePtr = zxing_asm.addFunction(decodeCallback, 'iiiiiffffffff');




export const drawCountours = (mask: ImageData): number[][] => {
  const mask_src = cv_asm.matFromImageData(mask)

  // 輪郭検出
  cv_asm.cvtColor(mask_src, mask_src, cv_asm.COLOR_RGBA2GRAY, 0); // そもそもグレースケールなのでおそらく意味がない。
  let contours = new cv_asm.MatVector();
  let hierarchy = new cv_asm.Mat();
  cv_asm.findContours(mask_src, contours, hierarchy, cv_asm.RETR_EXTERNAL, cv_asm.CHAIN_APPROX_TC89_L1);


  const detectedAreas = []
  for (let i = 0; i < contours.size(); i++) {
    // 輪郭毎の処理。
    // 輪郭の描画、検出
    //window.cv2.drawContours(dst, contours, i, color, 3, l, hierarchy, max_level)
    const area = cv_asm.contourArea(contours.get(i));
    //      console.log('AREA SIZE: ', area)
    if (area < 1000) {
      continue
    }

    // // バウンディングボックスの検出
    // const { x, y, width, height } = cv_asm.boundingRect(contours.get(i))
    // let color2 = new cv_asm.Scalar(255, 255, 0, 255);
    // let start  = new cv_asm.Point(x, y);
    // let end    = new cv_asm.Point(x + width, y + height);
    // // cv.rectangle(dst, start, end, color2, 4, l, 0)

    // // 画像変形用の枠としての座標取得。
    // //// [[左上の座標],[右上の座標],[左下の座標],[右下の座標]]



    // 回転矩形の4点取得(minimumArea)　≒最小エリア
    let rotatedRect = cv_asm.minAreaRect(contours.get(i));
    let vertices = cv_asm.RotatedRect.points(rotatedRect);


    // // 回転矩形の描画
    // for (let i = 0; i < 4; i++) {
    //   cv.line(dst, vertices[i], vertices[(i + 1) % 4], color3, 2, l, 0);
    // }


    //回転矩形の頂点取得＋変形用ソート[[左上の座標],[右上の座標],[左下の座標],[右下の座標]]
    let src_pers = []
    for (let i = 0; i < 4; i++) {
      src_pers.push(vertices[i])
    }
    src_pers.sort((a, b) => {
      return a.y - b.y;
    })
    const tops = [src_pers[0], src_pers[1]].sort((a, b) => {
      return a.x - b.x
    })
    const bottom = [src_pers[2], src_pers[3]].sort((a, b) => {
      return a.x - b.x
    })

    // マージンを追加
    const margin = AIConfig.CROP_MARGIN
    tops[0].x -= margin
    tops[0].y -= margin
    tops[1].x += margin
    tops[1].y -= margin
    bottom[0].x -= margin
    bottom[0].y += margin
    bottom[1].x += margin
    bottom[1].y += margin
    // // 回転矩形の描画
    // cv.line(dst, tops[0], tops[1], color3, 2, l, 0);
    // cv.line(dst, tops[1], bottom[1], color3, 2, l, 0);
    // cv.line(dst, bottom[1], bottom[0], color3, 2, l, 0);
    // cv.line(dst, bottom[0], tops[0], color3, 2, l, 0);

    src_pers = [tops[0].x / mask.width, tops[0].y / mask.height, tops[1].x / mask.width, tops[1].y / mask.height,
    bottom[0].x / mask.width, bottom[0].y / mask.height, bottom[1].x / mask.width, bottom[1].y / mask.height]
    detectedAreas.push(src_pers)

    rotatedRect = null
    vertices = null
  }
  hierarchy.delete()
  contours.delete()
  mask_src.delete()
  return detectedAreas
}

export const transform = (video_img: ImageData, areas: number[][]): ImageData[] => {
  const transformed_width = AIConfig.TRANSFORMED_WIDTH
  const transformed_height = AIConfig.TRANSFORMED_HEIGHT
  // console.log("--- areas ---", areas)
  const area_num = areas.length
  const video_src = cv_asm.matFromImageData(video_img)
  // console.log("VIDEO SIZE4: ", video_img.width, video_img.height)
  const transformedImages = []
  for (let i = 0; i < area_num; i++) {
    const src_pers = areas[i].map((x: number, index: number) => {
      if (index % 2 == 0) {
        return Math.floor(x * video_img.width)
      } else {
        return Math.floor(x * video_img.height)
      }
    })
    const dst_pers = [0, 0, transformed_width, 0, 0, transformed_height, transformed_width, transformed_height]
    let srcTri = cv_asm.matFromArray(4, 1, cv_asm.CV_32FC2, src_pers);
    let dstTri = cv_asm.matFromArray(4, 1, cv_asm.CV_32FC2, dst_pers);
    // console.log("VIDEO SIZE4: SRC PERSPECT: ", src_pers)
    // console.log("DST PERSPECT: ", dst_pers)

    // 図形を変形
    const M = cv_asm.getPerspectiveTransform(srcTri, dstTri)
    let tmp_dst = new cv_asm.Mat();
    let dsize = new cv_asm.Size(transformed_width, transformed_height);
    try {
      cv_asm.warpPerspective(video_src, tmp_dst, M, dsize, cv_asm.INTER_LINEAR, cv_asm.BORDER_CONSTANT, new cv_asm.Scalar());
    } catch (e) {
      console.log("exception at transform!!!!")
      console.log(e)
    }

    // 変形図形の描画(イメージ生成)
    try {
      let imgData = new ImageData(new Uint8ClampedArray(tmp_dst.data), tmp_dst.cols, tmp_dst.rows)
      transformedImages.push(imgData)
    } catch (e) {
      console.log("exception at draw B!!!")
      console.log(e)
    }
    srcTri.delete(); dstTri.delete(); M.delete()
    tmp_dst.delete();
  }
  video_src.delete()
  return transformedImages

}



export const rotateImageByCV = (img: ImageData, angle: number): ImageData => {
  if (angle === 0) {
    return img
  }
  const src = cv_asm.matFromImageData(img)
  let dst = new cv_asm.Mat();
  let dsize = new cv_asm.Size(src.cols, src.rows);
  let center = new cv_asm.Point(src.cols / 2, src.rows / 2);
  let M = cv_asm.getRotationMatrix2D(center, angle, 1);
  cv_asm.warpAffine(src, dst, M, dsize, cv_asm.INTER_LINEAR, cv_asm.BORDER_CONSTANT, new cv_asm.Scalar());

  const imgData = new ImageData(new Uint8ClampedArray(dst.data), dst.cols, dst.rows)
  dst.delete();
  src.delete();
  M.delete()
  // dsize.delete();
  // center.delete();
  return imgData
}



export const scanBarcode_google = async (image: ImageData, angle: number[]): Promise<string> => {
  barcode = ""

  const promiseList = []

  for (let k = 0; k < angle.length; k++) {
      const rotatedData = rotateImageByCV(image, angle[k])


      // const start = performance.now();
      // barcodeDetector.detect(rotatedData).then((barcodes:any[])=>{
      //   console.log(barcodes)
      //   if(barcodes.length >0){
      //     barcode = barcodes[0].rawValue
      //     return barcode
      //   }

      //   const end = performance.now();
      //   const elapsed = (end - start);
      //   const elapsedStr = elapsed.toFixed(3);
      //   console.log(`Barcode Scan Time:${elapsedStr} ms`);
      // })

      const barcodes = await barcodeDetector.detect(rotatedData)
      if(barcodes.length >0){
        barcode = barcodes[0].rawValue as string
        return barcode
      }


    //   const idd = rotatedData.data;
    //   const input = zxing_asm._resize(rotatedData.width, rotatedData.height);
    //   for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
    //     zxing_asm.HEAPU8[input + j] = 0.2989 * idd[i + 0] + 0.5870 * idd[i + 1] + 0.1140 * idd[i + 2]
    //   }


    //   const err = zxing_asm._decode_ean13(decodePtr);
    // //if (barcode === "") {
    // //  zxing_asm._decode_qr(decodePtr);
    // //}
    // if (barcode !== "") {
    //   return barcode
    // }
  }
  return barcode
}

export const scanBarcode = async (image: ImageData, angle: number[]): Promise<string> => {
  barcode = ""

  for (let k = 0; k < angle.length; k++) {
      const rotatedData = rotateImageByCV(image, angle[k])

      const start = performance.now();

      const idd = rotatedData.data;
      const input = zxing_asm._resize(rotatedData.width, rotatedData.height);
      for (let i = 0, j = 0; i < idd.length; i += 4, j++) {
        zxing_asm.HEAPU8[input + j] = 0.2989 * idd[i + 0] + 0.5870 * idd[i + 1] + 0.1140 * idd[i + 2]
      }


      const err = zxing_asm._decode_ean13(decodePtr);
    //if (barcode === "") {
    //  zxing_asm._decode_qr(decodePtr);
    //}

      const end = performance.now();
      const elapsed = (end - start);
      const elapsedStr = elapsed.toFixed(3);
      console.log(`Barcode Scan Time:${elapsedStr} ms`);    
    if (barcode !== "") {
      return barcode
    }
  }
  return barcode
}



export const scanBarcodes = async (images: ImageData[]): Promise<string[]> => {
  const result = []
  let image_num = images.length
  for (let i = 0; i < image_num; i++) {
    //    const barcode = scanBarcode(images[i], [0, 90, 85, 5])
    const barcode = await scanBarcode(images[i], [0, 90])
    result.push(barcode)
  }
  return result
}




onmessage = async (event) => {
  // console.log('---------WorkerCV_message---------')
  // console.log(event)

  if (event.data.message === WorkerCommand.SCAN_BARCODES) { // バグ作り込む原因。リファクタ。(SCAN_BARCODEとSCAN_BARCODESがある)
    const videoBitmap: ImageBitmap = event.data.videoBitmap
    const maskBitmap: ImageBitmap = event.data.maskBitmap


    // バーコードエリアの取得
    const maskOffscreen = new OffscreenCanvas(maskBitmap.width, maskBitmap.height)
    const maskCtx = maskOffscreen.getContext("2d")!
    maskCtx.drawImage(maskBitmap, 0, 0)
    const maskImageData = maskCtx.getImageData(0, 0, maskBitmap.width, maskBitmap.height)
    const areas = drawCountours(maskImageData)

    // バーコードエリアの変形
    const videoOffscreen = new OffscreenCanvas(videoBitmap.width, videoBitmap.height)
    const videoCtx = videoOffscreen.getContext("2d")!
    videoCtx.drawImage(videoBitmap, 0, 0)
    const videoImageData = videoCtx.getImageData(0, 0, videoBitmap.width, videoBitmap.height)
    const transformedImages = transform(videoImageData, areas)

    // for (let i =0; i< transformedImages.length; i++){
    //   console.log("transformedImage::::", transformedImages[i].width, transformedImages[i].height)
    // }

    // バーコードスキャン
    const barcodes = await scanBarcodes(transformedImages)

    ctx.postMessage({ message: WorkerResponse.SCANNED_BARCODES, barcodes: barcodes, areas: areas })

    videoBitmap.close()
    maskBitmap.close()
    event.data.maskBitmap = null
    event.data.videoBitmap = null
  }
};

export default onmessage