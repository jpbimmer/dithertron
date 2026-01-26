import GIF from 'gif.js';
import { ProcessedFrame } from '../common/types';

export interface GifExportOptions {
    quality?: number;      // 1-30, lower is better quality (default: 10)
    repeat?: number;       // 0 = loop forever, -1 = no repeat (default: 0)
    scaleX?: number;       // Horizontal scale factor for non-square pixels
    workerScript?: string; // Path to gif.worker.js
}

export function exportAnimatedGif(
    frames: ProcessedFrame[],
    width: number,
    height: number,
    options: GifExportOptions = {}
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const {
            quality = 10,
            repeat = 0,
            scaleX = 1,
            workerScript = './gen/gif.worker.js'
        } = options;

        // Calculate output dimensions (accounting for non-square pixels)
        const outputWidth = Math.round(width * scaleX);
        const outputHeight = height;

        const gif = new GIF({
            workers: 2,
            quality,
            width: outputWidth,
            height: outputHeight,
            repeat,
            workerScript
        });

        // Create a temporary canvas for frame rendering
        const canvas = document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext('2d')!;

        // Add each frame to the GIF
        frames.forEach((frame) => {
            // Create ImageData from the processed frame pixels
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = width;
            sourceCanvas.height = height;
            const sourceCtx = sourceCanvas.getContext('2d')!;

            const imageData = sourceCtx.createImageData(width, height);
            const data = new Uint32Array(imageData.data.buffer);
            data.set(frame.img);
            sourceCtx.putImageData(imageData, 0, 0);

            // Scale to output dimensions if needed
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, outputWidth, outputHeight);
            ctx.drawImage(sourceCanvas, 0, 0, outputWidth, outputHeight);

            // Add frame with its delay
            gif.addFrame(ctx, {
                copy: true,
                delay: frame.delay
            });
        });

        gif.on('finished', (blob: Blob) => {
            resolve(blob);
        });

        gif.on('error', (err: Error) => {
            reject(err);
        });

        gif.render();
    });
}

export function exportSingleFrameGif(
    pixels: Uint32Array,
    width: number,
    height: number,
    options: GifExportOptions = {}
): Promise<Blob> {
    const frame: ProcessedFrame = {
        img: pixels,
        indexed: new Uint32Array(0),
        pal: new Uint32Array(0),
        delay: 0
    };

    return exportAnimatedGif([frame], width, height, options);
}
