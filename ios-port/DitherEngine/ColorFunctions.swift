// ColorFunctions.swift
// Dithertron iOS Port — Color distance functions
//
// Direct translation of src/common/color.ts error functions.
// All functions operate on packed UInt32 pixels in internal format:
//   bits [7:0]=R, [15:8]=G, [23:16]=B, [31:24]=A

import Foundation

// MARK: - Pixel component extraction

@inline(__always)
func redComponent(_ pixel: UInt32) -> Float {
    Float(pixel & 0xFF)
}

@inline(__always)
func greenComponent(_ pixel: UInt32) -> Float {
    Float((pixel >> 8) & 0xFF)
}

@inline(__always)
func blueComponent(_ pixel: UInt32) -> Float {
    Float((pixel >> 16) & 0xFF)
}

// MARK: - Distance functions (squared variants for comparison-only paths)

/// Perceptual color distance using weighted Euclidean formula.
/// Attempt to account for human eye sensitivity (red-weighted).
/// Matches getRGBAErrorPerceptual in color.ts:154
func perceptualDistance(_ a: UInt32, _ b: UInt32) -> Float {
    return sqrt(perceptualDistanceSq(a, b))
}

/// Squared variant — avoids sqrt, use when only comparing distances.
/// Matches getRGBAErrorPerceptualSq in color.ts:183
func perceptualDistanceSq(_ a: UInt32, _ b: UInt32) -> Float {
    let r1 = redComponent(a), g1 = greenComponent(a), b1 = blueComponent(a)
    let r2 = redComponent(b), g2 = greenComponent(b), b2 = blueComponent(b)
    let rmean = (r1 + r2) / 2.0
    let dr = r1 - r2
    let dg = g1 - g2
    let db = b1 - b2
    return ((512.0 + rmean) * dr * dr / 256.0) + 4.0 * dg * dg + ((767.0 - rmean) * db * db / 256.0)
}

/// Simple Euclidean RGB distance.
/// Matches getRGBAErrorAbsolute in color.ts:124
func absoluteDistance(_ a: UInt32, _ b: UInt32) -> Float {
    return sqrt(absoluteDistanceSq(a, b))
}

func absoluteDistanceSq(_ a: UInt32, _ b: UInt32) -> Float {
    let dr = redComponent(a) - redComponent(b)
    let dg = greenComponent(a) - greenComponent(b)
    let db = blueComponent(a) - blueComponent(b)
    return dr * dr + dg * dg + db * db
}

/// Max-channel distance.
/// Matches getRGBAErrorMax in color.ts:168
func maxDistance(_ a: UInt32, _ b: UInt32) -> Float {
    let dr = abs(redComponent(a) - redComponent(b))
    let dg = abs(greenComponent(a) - greenComponent(b))
    let db = abs(blueComponent(a) - blueComponent(b))
    return max(dr, max(dg, db))
}

func maxDistanceSq(_ a: UInt32, _ b: UInt32) -> Float {
    let m = maxDistance(a, b)
    return m * m
}

/// Color intensity (perceptual distance from black).
/// Matches intensity in color.ts:178
func colorIntensity(_ color: UInt32) -> Float {
    return perceptualDistance(0, color)
}

// MARK: - Error function dispatch

typealias ColorDistanceFunction = (UInt32, UInt32) -> Float
typealias ColorDistanceSqFunction = (UInt32, UInt32) -> Float

func distanceFunction(named name: String) -> ColorDistanceFunction {
    switch name {
    case "perceptual": return perceptualDistance
    case "absolute", "dist": return absoluteDistance
    case "max": return maxDistance
    default: return perceptualDistance
    }
}

func distanceSqFunction(named name: String) -> ColorDistanceSqFunction {
    switch name {
    case "perceptual": return perceptualDistanceSq
    case "absolute", "dist": return absoluteDistanceSq
    case "max": return maxDistanceSq
    default: return perceptualDistanceSq
    }
}

// MARK: - Closest color lookup

/// Find the index into `palette` that is closest to `color`.
/// Matches getClosestRGB in color.ts:242
/// `validIndices` restricts which palette entries are candidates (pass nil for all).
func closestPaletteIndex(
    for color: UInt32,
    in palette: [UInt32],
    validIndices: [Int]? = nil,
    distfnSq: ColorDistanceSqFunction = perceptualDistanceSq
) -> Int {
    let indices = validIndices ?? Array(0..<palette.count)
    var bestScore: Float = .infinity
    var bestIdx = 0
    for idx in indices where idx >= 0 && idx < palette.count {
        let score = distfnSq(color, palette[idx])
        if score < bestScore {
            bestScore = score
            bestIdx = idx
        }
    }
    return bestIdx
}

// MARK: - RGB diff (for error distribution)

/// Returns per-channel difference (ref - img) as (dR, dG, dB).
/// Matches getRGBADiff in color.ts:117
@inline(__always)
func rgbDiff(_ ref: UInt32, _ img: UInt32) -> (Float, Float, Float) {
    let dr = Float(Int(ref & 0xFF) - Int(img & 0xFF))
    let dg = Float(Int((ref >> 8) & 0xFF) - Int((img >> 8) & 0xFF))
    let db = Float(Int((ref >> 16) & 0xFF) - Int((img >> 16) & 0xFF))
    return (dr, dg, db)
}

// MARK: - Pack/unpack helpers

/// Pack R, G, B bytes (clamped 0–255) into internal UInt32 format.
@inline(__always)
func packRGB(r: Float, g: Float, b: Float) -> UInt32 {
    let rc = UInt32(max(0, min(255, Int(r))))
    let gc = UInt32(max(0, min(255, Int(g))))
    let bc = UInt32(max(0, min(255, Int(b))))
    return rc | (gc << 8) | (bc << 16) | 0xFF000000
}
