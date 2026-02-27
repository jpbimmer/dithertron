// DitherEngine.swift
// Dithertron iOS Port — Top-level orchestrator
//
// Wires together preset loading, palette reduction, and the dithering canvas.
// This is the entry point the iOS app calls.
//
// Integration notes for the iOS agent:
//   - Call `dither(image:preset:)` with a source UIImage and a DitherPreset
//   - Returns the dithered UIImage
//   - Use async/await to run off the main thread
//   - The progress callback can drive a UI progress indicator

import Foundation

struct DitherResult {
    /// Dithered pixel data in internal UInt32 format
    let pixels: [UInt32]
    /// Output image dimensions
    let width: Int
    let height: Int
    /// The palette that was actually used (after any reduction)
    let palette: [UInt32]
    /// Number of iterations performed
    let iterations: Int
}

enum DitherEngine {

    /// Run dithering on raw pixel data with a preset.
    ///
    /// This is the core function. The iOS integration layer should:
    /// 1. Scale the source UIImage to preset.width x preset.height
    /// 2. Extract pixels as [UInt32] in internal format (R in low byte)
    /// 3. Call this function
    /// 4. Convert the result pixels back to a UIImage
    ///
    /// - Parameters:
    ///   - sourcePixels: Source image pixels, length = preset.width * preset.height
    ///   - preset: The dithering preset to apply
    ///   - progress: Optional callback (iteration, maxIterations, isFinal) -> shouldContinue
    /// - Returns: DitherResult with the dithered pixels and metadata
    static func dither(
        sourcePixels: [UInt32],
        preset: DitherPreset,
        progress: ((Int, Int, Bool) -> Bool)? = nil
    ) -> DitherResult {
        // 1. Parse palette from preset
        var palette = preset.parsedPalette()

        // 2. Reduce palette if needed (e.g., NES: 64 → 4 colors)
        //    Matches Dithertron.iterate() in dithertron.ts:44-49
        if let reduceCount = preset.reduce, reduceCount > 0 && palette.count > reduceCount {
            let distfn = distanceFunction(named: preset.effectiveErrfn)
            palette = reducePalette(
                imagePixels: sourcePixels,
                palette: palette,
                count: reduceCount,
                diversity: 0,  // paletteDiversity defaults to 0
                distfn: distfn
            )
        }

        // 3. Create canvas and configure
        let canvas = DitherCanvas(
            sourcePixels: sourcePixels,
            width: preset.width,
            palette: palette
        )

        canvas.diffuse = Float(preset.effectiveDiffuse)
        canvas.initialDiffuse = canvas.diffuse
        canvas.ordered = Float(preset.effectiveOrdered)
        canvas.noise = preset.effectiveNoise > 0 ? (1 << (preset.effectiveNoise + 2)) : 0
        canvas.kernel = DitherKernels.kernel(named: preset.effectiveKernel)
        canvas.distfn = distanceFunction(named: preset.effectiveErrfn)
        canvas.distfnSq = distanceSqFunction(named: preset.effectiveErrfn)

        // 4. Run iterative dithering
        canvas.run(progress: progress)

        // 5. Return result
        return DitherResult(
            pixels: canvas.img,
            width: canvas.width,
            height: canvas.height,
            palette: palette,
            iterations: canvas.iterateCount
        )
    }
}
