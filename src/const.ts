export const WorkerCommand = {
    SCAN_BARCODES: "SCAN_BARCODES"
}

export const WorkerResponse = {
    INITIALIZED: "INITIALIZED",
    SCANNED_BARCODES: "SCANNED_BARCODES"
}


export const AIConfig = {
    SS_MODEL_PATH: '/multi-barcode-scanner-js-model/model.json',

    SPLIT_MARGIN: 0.2,
    SPLIT_WIDTH: 300,
    SPLIT_HEIGHT: 300,
    TRANSFORMED_WIDTH: 300,
    TRANSFORMED_HEIGHT: 300,
    TRANSFORMED_MAX: 300,
    CROP_MARGIN: 20,
    DRAW_RECT_MARGIN: 10,

}
