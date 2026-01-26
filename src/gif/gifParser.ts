import { parseGIF, decompressFrames, ParsedGif, ParsedFrame } from 'gifuct-js';
import { GifFrameData } from '../common/types';

export interface ParsedAnimatedGif {
    frames: GifFrameData[];
    width: number;
    height: number;
    isAnimated: boolean;
}

// Disposal methods
const DISPOSAL_UNSPECIFIED = 0;
const DISPOSAL_NONE = 1;
const DISPOSAL_BACKGROUND = 2;
const DISPOSAL_PREVIOUS = 3;

export function parseAnimatedGif(buffer: ArrayBuffer): ParsedAnimatedGif {
    const gif = parseGIF(buffer);
    const rawFrames = decompressFrames(gif, true);

    const width = gif.lsd.width;
    const height = gif.lsd.height;

    // Create a composite canvas to handle disposal methods
    const compositeCanvas = new Uint32Array(width * height);
    let previousCanvas: Uint32Array | null = null;

    const frames: GifFrameData[] = rawFrames.map((frame) => {
        // Save previous state if needed for DISPOSAL_PREVIOUS
        if (frame.disposalType === DISPOSAL_PREVIOUS) {
            previousCanvas = new Uint32Array(compositeCanvas);
        }

        // Apply frame patch to composite canvas
        applyFramePatch(compositeCanvas, frame, width, height);

        // Create frame data from current composite
        const pixels = new Uint32Array(compositeCanvas);

        const frameData: GifFrameData = {
            pixels,
            delay: frame.delay || 100, // Default to 100ms if not specified
            width,
            height
        };

        // Handle disposal for next frame
        handleDisposal(compositeCanvas, frame, width, height, previousCanvas);

        return frameData;
    });

    return {
        frames,
        width,
        height,
        isAnimated: frames.length > 1
    };
}

function applyFramePatch(
    composite: Uint32Array,
    frame: ParsedFrame,
    canvasWidth: number,
    canvasHeight: number
): void {
    const { dims, patch } = frame;
    const { width, height, left, top } = dims;

    // Patch is RGBA data (4 bytes per pixel)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const patchIndex = (y * width + x) * 4;
            const compositeIndex = (top + y) * canvasWidth + (left + x);

            // Check bounds
            if (compositeIndex < 0 || compositeIndex >= composite.length) continue;
            if (left + x >= canvasWidth || top + y >= canvasHeight) continue;

            // Get RGBA values from patch
            const r = patch[patchIndex];
            const g = patch[patchIndex + 1];
            const b = patch[patchIndex + 2];
            const a = patch[patchIndex + 3];

            // Skip transparent pixels (alpha = 0)
            if (a === 0) continue;

            // Convert to Uint32 format (ABGR in little-endian)
            composite[compositeIndex] = (a << 24) | (b << 16) | (g << 8) | r;
        }
    }
}

function handleDisposal(
    composite: Uint32Array,
    frame: ParsedFrame,
    canvasWidth: number,
    canvasHeight: number,
    previousCanvas: Uint32Array | null
): void {
    const { dims, disposalType } = frame;

    switch (disposalType) {
        case DISPOSAL_BACKGROUND:
            // Clear frame area to transparent/background
            clearFrameArea(composite, dims, canvasWidth, canvasHeight);
            break;
        case DISPOSAL_PREVIOUS:
            // Restore previous canvas state
            if (previousCanvas) {
                composite.set(previousCanvas);
            }
            break;
        case DISPOSAL_UNSPECIFIED:
        case DISPOSAL_NONE:
        default:
            // Leave composite as-is
            break;
    }
}

function clearFrameArea(
    composite: Uint32Array,
    dims: { width: number; height: number; top: number; left: number },
    canvasWidth: number,
    canvasHeight: number
): void {
    const { width, height, left, top } = dims;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const compositeIndex = (top + y) * canvasWidth + (left + x);
            if (compositeIndex >= 0 && compositeIndex < composite.length) {
                composite[compositeIndex] = 0; // Transparent
            }
        }
    }
}

export function isGifFile(file: File): boolean {
    return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}

export async function loadGifFromFile(file: File): Promise<ParsedAnimatedGif> {
    const buffer = await file.arrayBuffer();
    return parseAnimatedGif(buffer);
}
