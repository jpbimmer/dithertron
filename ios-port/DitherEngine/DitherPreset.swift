// DitherPreset.swift
// Dithertron iOS Port — Preset data model
//
// Maps to DithertronSettings from the web tool (src/common/types.ts)
// Simplified for iOS: no export formats, no native ROM output.

import Foundation

struct DitherPreset: Codable, Identifiable {
    let id: String
    let name: String

    /// Target output dimensions (the image is scaled to fit these before dithering)
    let width: Int
    let height: Int

    /// Palette colors as CSS hex strings "#RRGGBB" (no alpha)
    let palette: [String]

    /// If > 0, reduce the palette to this many colors using k-means before dithering.
    /// Used by NES (reduce: 4) to pick the best N colors for the specific input image.
    var reduce: Int?

    /// Error diffusion strength (0.0–1.0). Default 0.8.
    var diffuse: Double?

    /// Ordered dithering strength (0.0 = off). Default 0.0.
    var ordered: Double?

    /// Initial noise level (0 = none). Helps break ties in early iterations.
    var noise: Int?

    /// Dither kernel name: "floyd", "atkinson", "falsefloyd", "sierra2", "sierralite"
    var kernel: String?

    /// Error function name: "perceptual", "absolute", "max"
    var errfn: String?

    /// Display aspect ratio correction (e.g., 10/9 for Game Boy pixels)
    var pixelScaleX: Double?
    var pixelScaleY: Double?

    // MARK: - Computed defaults

    var effectiveDiffuse: Double { diffuse ?? 0.8 }
    var effectiveOrdered: Double { ordered ?? 0.0 }
    var effectiveNoise: Int { noise ?? 0 }
    var effectiveKernel: String { kernel ?? "floyd" }
    var effectiveErrfn: String { errfn ?? "perceptual" }
    var effectivePixelScaleX: Double { pixelScaleX ?? 1.0 }
    var effectivePixelScaleY: Double { pixelScaleY ?? 1.0 }

    // MARK: - Palette parsing

    /// Parse hex palette strings into packed UInt32 values.
    /// Internal pixel format: bits [7:0]=R, [15:8]=G, [23:16]=B, [31:24]=A (always 0xFF).
    /// This matches the TypeScript source (src/settings/palettes.ts RGB() function).
    func parsedPalette() -> [UInt32] {
        return palette.map { hex in
            let clean = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
            guard let val = UInt32(clean, radix: 16) else { return 0xFF000000 }
            // CSS hex is #RRGGBB → need to repack as 0xAABBGGRR (internal format)
            let r = (val >> 16) & 0xFF
            let g = (val >> 8) & 0xFF
            let b = val & 0xFF
            return r | (g << 8) | (b << 16) | 0xFF000000
        }
    }
}
