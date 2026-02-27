// DitherCanvas.swift
// Dithertron iOS Port — Core error diffusion dithering loop
//
// Direct translation of BaseDitheringCanvas from src/dither/basecanvas.ts
// This handles the actual pixel-by-pixel dithering with error diffusion.
//
// All 5 iOS presets use this canvas (no block constraints needed):
//   - Game Boy, NES, Virtual Boy, Apple II, BBC Micro all resolve to
//     DitheringCanvas in the web tool (or SNES_Canvas with vacuous block
//     constraints when palette size equals block color count).

import Foundation

// Bayer 8x8 ordered dithering threshold map (basecanvas.ts:18-27)
private let THRESHOLD_MAP_8X8: [Float] = [
     0, 48, 12, 60,  3, 51, 15, 63,
    32, 16, 44, 28, 35, 19, 47, 31,
     8, 56,  4, 52, 11, 59,  7, 55,
    40, 24, 36, 20, 43, 27, 39, 23,
     2, 50, 14, 62,  1, 49, 13, 61,
    34, 18, 46, 30, 33, 17, 45, 29,
    10, 58,  6, 54,  9, 57,  5, 53,
    42, 26, 38, 22, 41, 25, 37, 21,
]

/// Maximum iteration count before stopping (dithertron.ts:15)
let MAX_ITERATE_COUNT = 100

/// Temperature annealing constants (dithertron.ts:17-18)
private let TEMPERATURE_START_ITERATIONS = 5
private let TEMPERATURE_STEP: Float = 0.04

/// Core dithering canvas. Holds the image state and performs error-diffusion dithering.
class DitherCanvas {
    /// The palette colors available for dithering
    let pal: [UInt32]

    /// Image dimensions
    let width: Int
    let height: Int

    /// Reference image (original, never modified)
    let ref: [UInt32]

    /// Output image (dithered result, updated each iteration)
    var img: [UInt32]

    /// Error-adjusted alternative colors (intermediate buffer)
    var alt: [UInt32]

    /// Per-pixel error accumulator: 3 floats (R, G, B) per pixel
    var err: [Float]

    /// Per-pixel palette index (which palette color was chosen)
    var indexed: [Int]

    /// Configuration
    var noise: Int = 0
    var diffuse: Float = 0.8
    var initialDiffuse: Float = 0.8
    var ordered: Float = 0.0
    var errorThreshold: Float = 0.0
    var kernel: DitherKernel = DitherKernels.floyd

    /// Error/distance functions
    var distfn: ColorDistanceFunction = perceptualDistance
    var distfnSq: ColorDistanceSqFunction = perceptualDistanceSq

    /// Iteration state
    var iterateCount: Int = 0
    var changes: Int = 0
    private var scanDirection: Int = 1  // 1 = left-to-right, -1 = right-to-left

    // MARK: - Initialization

    /// Create a canvas from source image pixels and palette.
    /// - Parameters:
    ///   - sourcePixels: Source image in internal UInt32 format (length = width * height)
    ///   - width: Image width in pixels
    ///   - palette: Palette colors (already reduced if applicable)
    init(sourcePixels: [UInt32], width: Int, palette: [UInt32]) {
        self.width = width
        self.height = sourcePixels.count / width
        self.pal = palette.map { $0 | 0xFF000000 }  // ensure alpha (basecanvas.ts:58-59)

        self.ref = sourcePixels
        self.img = sourcePixels
        self.alt = sourcePixels
        self.err = [Float](repeating: 0, count: sourcePixels.count * 3)
        self.indexed = [Int](repeating: 0, count: sourcePixels.count)
    }

    // MARK: - Core update (per-pixel)

    /// Process a single pixel: apply error, find closest color, distribute residual.
    /// Direct translation of BaseDitheringCanvas.update() — basecanvas.ts:81-142
    private func update(offset: Int) {
        let errofs = offset * 3
        let rgbref = ref[offset]

        // Ordered dithering modulation (basecanvas.ts:86-89)
        var ko: Float = 1.0
        if ordered > 0 {
            let x = (offset % width) & 7
            let y = ((offset / width)) & 7
            ko = 1.0 + (THRESHOLD_MAP_8X8[x + y * 8] / 63.0 - 0.5) * ordered
        }

        // Apply accumulated error to reference pixel, clamp to 0-255
        // (basecanvas.ts:91-93 — Uint8ClampedArray provides clamping in TS)
        let adjR = max(0, min(255, Float(rgbref & 0xFF) * ko + err[errofs]))
        let adjG = max(0, min(255, Float((rgbref >> 8) & 0xFF) * ko + err[errofs + 1]))
        let adjB = max(0, min(255, Float((rgbref >> 16) & 0xFF) * ko + err[errofs + 2]))
        let adjusted = packRGB(r: adjR, g: adjG, b: adjB)

        // Store error-modified color (basecanvas.ts:95)
        alt[offset] = adjusted

        // Find closest palette color (basecanvas.ts:97-99)
        let palidx = closestPaletteIndex(for: adjusted, in: pal, distfnSq: distfnSq)
        let rgbimg = pal[palidx]

        // Compute per-channel error (basecanvas.ts:101-103)
        let (e0, e1, e2) = rgbDiff(adjusted, rgbimg)

        // Distribute error to neighbors via kernel (basecanvas.ts:113-126)
        let x = offset % width
        let y = offset / width
        let sd = scanDirection

        for channel in 0..<3 {
            let ev: Float = (channel == 0) ? e0 : (channel == 1 ? e1 : e2)
            let k = ev * diffuse
            for entry in kernel {
                let fdx = entry.dx * sd  // flip x for backward rows (serpentine)
                let targetX = x + fdx
                let targetY = y + entry.dy
                if targetX >= 0 && targetX < width && targetY >= 0 && targetY < height {
                    err[errofs + channel + (fdx + entry.dy * width) * 3] += k * entry.weight
                }
            }
            err[errofs + channel] = 0  // reset this pixel's error
        }

        // Decide whether to update the indexed color (basecanvas.ts:128-140)
        let errmag = (abs(e0) + abs(e1 * 2) + abs(e2)) / (256.0 * 4.0)
        if indexed[offset] != palidx {
            var shouldChange = errmag >= errorThreshold
            if !shouldChange {
                // Force update if old index is no longer valid (basecanvas.ts:131-135)
                let existingValue = indexed[offset]
                shouldChange = existingValue < 0 || existingValue >= pal.count
            }
            if shouldChange {
                indexed[offset] = palidx
                changes += 1
            }
        }

        // Write output pixel (basecanvas.ts:141)
        img[offset] = rgbimg
    }

    // MARK: - Iteration

    /// Run one full dithering pass over the image.
    /// Direct translation of BaseDitheringCanvas.iterate() — basecanvas.ts:157-185
    func iterate() {
        changes = 0

        // Clear error buffer each iteration (basecanvas.ts:160)
        err = [Float](repeating: 0, count: ref.count * 3)

        // Scan all rows with serpentine pattern (basecanvas.ts:172-181)
        for row in 0..<height {
            scanDirection = (row & 1 != 0) ? -1 : 1
            let rowBase = row * width
            if scanDirection == 1 {
                for col in 0..<width {
                    update(offset: rowBase + col)
                }
            } else {
                for col in stride(from: width - 1, through: 0, by: -1) {
                    update(offset: rowBase + col)
                }
            }
        }
        scanDirection = 1
        iterateCount += 1
    }

    /// Run the full iterative dithering process until convergence or max iterations.
    /// Implements the iteration loop from Dithertron.iterate() — dithertron.ts:37-93
    /// and the temperature annealing from dithertron.ts:71-79
    ///
    /// - Parameter progress: Optional callback invoked after each iteration with
    ///   (currentIteration, maxIterations, isFinal). Return false to cancel.
    /// - Returns: The final dithered image as UInt32 array
    @discardableResult
    func run(progress: ((Int, Int, Bool) -> Bool)? = nil) -> [UInt32] {
        for _ in 0...MAX_ITERATE_COUNT {
            iterate()

            // Dampen noise each iteration (dithertron.ts:70)
            noise >>= 1

            // Temperature annealing (dithertron.ts:72-78)
            if iterateCount > TEMPERATURE_START_ITERATIONS {
                diffuse = initialDiffuse * max(0.5, 1.0 - Float(iterateCount - TEMPERATURE_START_ITERATIONS) * 0.01)
            }
            if iterateCount >= TEMPERATURE_START_ITERATIONS {
                errorThreshold += TEMPERATURE_STEP
            }

            let isFinal = (changes == 0) || (iterateCount > MAX_ITERATE_COUNT)

            if let progress = progress {
                let shouldContinue = progress(iterateCount, MAX_ITERATE_COUNT, isFinal)
                if !shouldContinue { break }
            }

            if isFinal { break }
        }
        return img
    }
}
