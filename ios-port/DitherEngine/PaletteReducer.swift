// PaletteReducer.swift
// Dithertron iOS Port — K-means palette reduction
//
// Direct translation of reducePaletteChoices() from src/common/color.ts:28-97
// Used by presets with a "reduce" field (e.g., NES: reduce 64 colors to 4).
// The algorithm picks the N most representative colors from a large palette
// for a specific input image.

import Foundation

/// Reduce a palette to `count` colors that best represent the given image.
///
/// Algorithm overview (from color.ts):
/// 1. Start with `count` evenly-spaced palette indices as initial centroids.
/// 2. For each iteration, scan the image pixels with error accumulation.
/// 3. For each pixel, find the closest centroid color, add to centroid mean.
/// 4. After scanning, move each centroid to the closest palette entry to its mean.
/// 5. Repeat until stable or 10 iterations.
///
/// - Parameters:
///   - imagePixels: Source image as packed UInt32 array (internal format)
///   - palette: Full palette to reduce from
///   - count: Target number of colors
///   - diversity: Controls centroid spread (0 = default, higher = more diverse)
///   - distfn: Color distance function to use
/// - Returns: Reduced palette sorted by intensity, length = count
func reducePalette(
    imagePixels: [UInt32],
    palette: [UInt32],
    count: Int,
    diversity: Float = 0,
    distfn: ColorDistanceFunction = perceptualDistance
) -> [UInt32] {
    guard palette.count > count else { return palette }

    // Use the same distfn for both pixel scoring and centroid moves,
    // matching color.ts which passes distfn to both getClosestRGB calls.
    // For pixel scoring we can use squared variant (comparison-only, no sqrt).
    let distfnForPixels = distanceSqFunction(named: "perceptual") // perf optimization
    let distfnForCentroids: ColorDistanceSqFunction = { a, b in
        // Use caller-supplied distfn for centroid moves (color.ts:78)
        let d = distfn(a, b)
        return d * d  // square it for consistent comparison semantics
    }

    let bias = diversity
    let decay: Float = diversity * 0.5 + 0.4

    // Initial centroid indices: evenly spaced through palette
    var selectedIndices = (0..<count).map { i in
        Int(Float(i) * Float(palette.count - 1) / Float(count))
    }

    // Centroid accumulators
    struct Centroid {
        var r: Float = 0
        var g: Float = 0
        var b: Float = 0
        var n: Int = 0

        mutating func add(_ pixel: UInt32) {
            r += redComponent(pixel)
            g += greenComponent(pixel)
            b += blueComponent(pixel)
            n += 1
        }

        func averageRGB(k: Float) -> UInt32 {
            guard n > 0 else { return 0 }
            return packRGB(
                r: r * k / Float(n),
                g: g * k / Float(n),
                b: b * k / Float(n)
            )
        }
    }

    var histo = [Int32](repeating: 0, count: palette.count)

    // K-means iterations (max 10, matching color.ts:49)
    for iter in 0..<10 {
        var centroids = [Centroid](repeating: Centroid(), count: count)

        // Error accumulator as Int32 to match TypeScript Int32Array behavior.
        // TS truncates to integer after decay step (color.ts:36).
        var errR: Int32 = 0, errG: Int32 = 0, errB: Int32 = 0

        // Scan pixels with stride for performance (matching color.ts:51)
        var i = iter
        while i < imagePixels.count {
            let pixel = imagePixels[i]
            errR += Int32(pixel & 0xFF)
            errG += Int32((pixel >> 8) & 0xFF)
            errB += Int32((pixel >> 16) & 0xFF)

            // Clamp to 0-255 (Uint8ClampedArray behavior from TS)
            let clampedR = max(0, min(255, errR))
            let clampedG = max(0, min(255, errG))
            let clampedB = max(0, min(255, errB))
            let adjusted = UInt32(clampedR) | (UInt32(clampedG) << 8) | (UInt32(clampedB) << 16) | 0xFF000000

            // Find closest among current selected palette colors
            let closestIdx = closestPaletteIndex(
                for: adjusted,
                in: palette,
                validIndices: selectedIndices,
                distfnSq: distfnForPixels
            )

            // Add to centroid for this selection
            if let centroidPos = selectedIndices.firstIndex(of: closestIdx) {
                centroids[centroidPos].add(adjusted)
            }

            // Score for histogram
            let chosen = palette[closestIdx]
            let score = distfn(adjusted, chosen)
            histo[closestIdx] += Int32(max(0, 256 - Int(score)))

            // Subtract chosen color and decay (error diffusion during selection)
            // Then truncate to Int32 to match TypeScript Int32Array behavior
            errR -= Int32(chosen & 0xFF)
            errG -= Int32((chosen >> 8) & 0xFF)
            errB -= Int32((chosen >> 16) & 0xFF)
            errR = Int32(Float(errR) * decay)
            errG = Int32(Float(errG) * decay)
            errB = Int32(Float(errB) * decay)

            // Stride: skip (i & 15) + 1 pixels (matching color.ts:51)
            i += (i & 15) + 1
        }

        // Move centroids toward their mean color in the palette
        var available = Array(0..<palette.count)
        var changed = false

        for j in 0..<count {
            let centroidColor = centroids[j].averageRGB(k: bias)
            let newIdx = closestPaletteIndex(
                for: centroidColor,
                in: palette,
                validIndices: available,
                distfnSq: distfnForCentroids  // uses caller-supplied distfn (color.ts:78)
            )

            if palette[newIdx] != palette[selectedIndices[j]] {
                selectedIndices[j] = newIdx
                changed = true
            }

            // Exclude this palette entry from future selections
            let chosen = palette[newIdx]
            for k in 0..<available.count {
                if available[k] >= 0 && palette[available[k]] == chosen {
                    available[k] = -1
                }
            }
        }

        if !changed { break }
    }

    // Return selected colors sorted by intensity (matching color.ts:94-96)
    let result = selectedIndices.map { palette[$0] }
    return result.sorted { colorIntensity($0) < colorIntensity($1) }
}
