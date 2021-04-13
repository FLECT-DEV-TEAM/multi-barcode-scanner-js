import { WorkerResponse, WorkerCommand, AIConfig } from "./const";
import { ScalableSemanticSegmentation } from 'scalable-semantic-segmentation-js'

class Filters {
    ConvolutionFilter = (
        srcImageData:ImageData, 
        matrixX:number, matrixY:number, matrix:number[]) => {
            const canvas = document.createElement('canvas')
            const srcPixels    = srcImageData.data
            const srcWidth     = srcImageData.width
            const srcHeight    = srcImageData.height
            const srcLength    = srcPixels.length
            canvas.width=srcWidth
            canvas.height=srcHeight
            const dstImageData = canvas.getContext("2d")!.createImageData(srcWidth, srcHeight)
            const dstPixels    = dstImageData.data

            const divisor = 1
            const bias    = 0
            const preserveAlpha = true
            const clamp = true

            const color = 0
            const alpha = 0

            var index = 0,
                rows = matrixX >> 1,
                cols = matrixY >> 1,
                clampR = color >> 16 & 0xFF,
                clampG = color >>  8 & 0xFF,
                clampB = color       & 0xFF,
                clampA = alpha * 0xFF;

        for (var y = 0; y < srcHeight; y += 1) {
            for (var x = 0; x < srcWidth; x += 1, index += 4) {
                var r = 0,
                    g = 0,
                    b = 0,
                    a = 0,
                    replace = false,
                    mIndex = 0,
                    v;

                for (var row = -rows; row <= rows; row += 1) {
                    let rowIndex = y + row
                    let offset = 0

                    if (0 <= rowIndex && rowIndex < srcHeight) {
                        offset = rowIndex * srcWidth;
                    }
                    else if (clamp) {
                        offset = y * srcWidth;
                    }
                    else {
                        replace = true;
                    }

                    for (var col = -cols; col <= cols; col += 1) {
                        var m = matrix[mIndex++];

                        if (m !== 0) {
                            var colIndex = x + col;

                            if (!(0 <= colIndex && colIndex < srcWidth)) {
                                if (clamp) {
                                    colIndex = x;
                                }
                                else {
                                    replace = true;
                                }
                            }

                            if (replace) {
                                r += m * clampR;
                                g += m * clampG;
                                b += m * clampB;
                                a += m * clampA;
                            }
                            else {
                                var p = (offset + colIndex) << 2;
                                r += m * srcPixels[p];
                                g += m * srcPixels[p + 1];
                                b += m * srcPixels[p + 2];
                                a += m * srcPixels[p + 3];
                            }
                        }
                    }
                }

                dstPixels[index]     = (v = r / divisor + bias) > 255 ? 255 : v < 0 ? 0 : v | 0;
                dstPixels[index + 1] = (v = g / divisor + bias) > 255 ? 255 : v < 0 ? 0 : v | 0;
                dstPixels[index + 2] = (v = b / divisor + bias) > 255 ? 255 : v < 0 ? 0 : v | 0;
                dstPixels[index + 3] = preserveAlpha ? srcPixels[index + 3] : (v = a / divisor + bias) > 255 ? 255 : v < 0 ? 0 : v | 0;
            }
        }

        return dstImageData;
    };

    sharpen = (srcImageData:ImageData, factor:number=3) => {
        return this.ConvolutionFilter(srcImageData, 3, 3, [
            -factor/16,     -factor/8,      -factor/16,
            -factor/8,       factor*0.75+1, -factor/8,
            -factor/16,     -factor/8,      -factor/16
        ]);
    };
}

export class MultiBarcodeReader{
    scalableSS:ScalableSemanticSegmentation = new ScalableSemanticSegmentation()

    private workerSSInitialized = false
    private workerCVInitialized = false
    private workerCV:Worker|null = null
    private video_img:ImageData|null = null
    private working_video_img:ImageData|null = null

    private _barcodePreviewCanvas:HTMLCanvasElement|null = null
    private initializedListeners     :(()=>void)[] = []
    private waitNextFrameListeners   :(()=>void)[] = []
    private scanedBarcordListeners   :((barcodes:string[], areas:number[][])=>void)[] = []

    addInitializedListener = (f:(()=>void)) =>{
        this.initializedListeners.push(f)
    }
    addWaitNextFrameListeners = (f:(()=>void)) =>{
        this.waitNextFrameListeners.push(f)
    }
    addScanedBarcordListeners = (f:((barcodes:string[], areas:number[][])=>void)) =>{
        this.scanedBarcordListeners.push(f)
    }


    set barcodePreviewCanvas(val:HTMLCanvasElement|null){
        this._barcodePreviewCanvas=val
    }
    set girdDrawCanvas(val:HTMLCanvasElement|null){
        this.scalableSS.girdDrawCanvas=val
    }
    set previewCanvas(val:HTMLCanvasElement|null){
        this.scalableSS.previewCanvas=val
    }

    checkAndStart = () =>{
        if(this.workerSSInitialized      === true && 
            this.workerCVInitialized     === true
            ){
            this.initializedListeners.map(f=>f())
        }
    }

    init(){
        // console.log("Worker initializing... ")

        // SemanticSegmentation 用ワーカー
        this.scalableSS.addInitializedListener(()=>{
            this.workerSSInitialized = true
            this.checkAndStart()
        })
        this.scalableSS.addMaskPredictedListeners((maskBitmap:ImageBitmap)=>{
            // console.log("MASK PREDICTED")
            this.working_video_img = this.video_img //再キャプチャの前に処理中のimageをバックアップ

            // 再キャプチャ
            //this.requestScanBarcode()
            this.waitNextFrameListeners.map(f=>f())

            const videoOffscreen = new OffscreenCanvas(this.working_video_img!.width, this.working_video_img!.height)
            videoOffscreen.getContext("2d")!.putImageData(this.working_video_img!, 0, 0)
            const videoBitmap = videoOffscreen.transferToImageBitmap()

            this.workerCV!.postMessage({ message: WorkerCommand.SCAN_BARCODES, videoBitmap: videoBitmap, maskBitmap:maskBitmap}, [videoBitmap, maskBitmap])
        })

        this.scalableSS.init(AIConfig.SS_MODEL_PATH, AIConfig.SPLIT_WIDTH, AIConfig.SPLIT_HEIGHT, AIConfig.SPLIT_MARGIN)

        // バーコード読み取り用ワーカー
        // this.workerCV = new Worker('./workerCV.ts', { type: 'module' })
        this.workerCV = new Worker('./workerCV.js', { type: 'module' })        
        this.workerCV.onmessage = (event) => {
            if (event.data.message === WorkerResponse.INITIALIZED) {
                // console.log("WORKERCV INITIALIZED")
                this.workerCVInitialized = true
                this.checkAndStart()
            }else if(event.data.message === WorkerResponse.SCANNED_BARCODES){
                const barcodes = event.data.barcodes as string[]
                const areas    = event.data.areas as number[][]
                // console.log("SCANNED_BARCODES", areas, barcodes)
                if(this._barcodePreviewCanvas !== null){
                    this.previewAreas(areas, barcodes)
                }
                this.scanedBarcordListeners.map(f=>f(barcodes,areas))
                event.data.barcodes = null
                event.data.areas    = null
            }
        }

    }    


    requestScanBarcode = (captureCanvas:HTMLCanvasElement, col_num:number, row_num:number) =>{
        this.scalableSS.predict(captureCanvas, col_num, row_num)
        this.video_img = captureCanvas.getContext("2d")!.getImageData(0, 0, captureCanvas.width, captureCanvas.height)
        // const filter = new Filters()
        // this.video_img = filter.sharpen(this.video_img)
    }

    previewAreas = (areas:number[][], barcodes:string[]) =>{

        const areaCV = this._barcodePreviewCanvas!

        const ctx2 = areaCV.getContext("2d")!
        ctx2.clearRect(0, 0, areaCV.width, areaCV.height)
        ctx2.strokeStyle  = "#DD3333FF";
        ctx2.lineWidth    = 1;
        const font       = "32px sans-serif";
        ctx2.font         = font;
        ctx2.textBaseline = "top";
        ctx2.fillStyle = "#DD3333FF";


        const area_num = areas.length
        ctx2.beginPath();
        for(let i = 0; i < area_num; i ++){
            if(barcodes[i] === ""){
                continue
            }
            const area = areas[i]
            // const margin = AIConfig.DRAW_RECT_MARGIN
            // ctx2.moveTo(area[0] * areaCV.width + margin, area[1] * areaCV.height + margin)
            // ctx2.lineTo(area[2] * areaCV.width - margin, area[3] * areaCV.height + margin)
            // ctx2.lineTo(area[6] * areaCV.width - margin, area[7] * areaCV.height - margin)
            // ctx2.lineTo(area[4] * areaCV.width + margin, area[5] * areaCV.height - margin)
            // ctx2.lineTo(area[0] * areaCV.width + margin, area[1] * areaCV.height + margin)
            // ctx2.stroke();
            ctx2.fillText(barcodes[i], area[0] * areaCV.width, area[1] * areaCV.height)
        }
        ctx2.closePath();
    }    

}
