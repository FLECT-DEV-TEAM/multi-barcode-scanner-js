import { WorkerResponse, WorkerCommand, AIConfig } from "./const";
import { ScalableSemanticSegmentation } from 'scalable-semantic-segmentation-js'


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
    private scanedBarcordListeners   :(()=>void)[] = []

    addInitializedListener = (f:(()=>void)) =>{
        this.initializedListeners.push(f)
    }
    addWaitNextFrameListeners = (f:(()=>void)) =>{
        this.waitNextFrameListeners.push(f)
    }
    addScanedBarcordListeners = (f:(()=>void)) =>{
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
        this.workerCV = new Worker('./workerCV.ts', { type: 'module' })
        this.workerCV.onmessage = (event) => {
            if (event.data.message === WorkerResponse.INITIALIZED) {
                // console.log("WORKERCV INITIALIZED")
                this.workerCVInitialized = true
                this.checkAndStart()
            }else if(event.data.message === WorkerResponse.SCANNED_BARCODES){
                const barcodes = event.data.barcodes
                const areas    = event.data.areas
                // console.log("SCANNED_BARCODES", areas, barcodes)
                if(this._barcodePreviewCanvas !== null){
                    this.previewAreas(areas, barcodes)
                }
                event.data.barcodes = null
                event.data.areas    = null
            }
        }

    }    


    requestScanBarcode = (captureCanvas:HTMLCanvasElement, col_num:number, row_num:number) =>{
        this.scalableSS.predict(captureCanvas, col_num, row_num)
        this.video_img = captureCanvas.getContext("2d")!.getImageData(0, 0, captureCanvas.width, captureCanvas.height)
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
