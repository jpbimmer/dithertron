# Dithertron iOS Port — Specification

## Overview

This folder contains the core dithering engine ported from TypeScript to Swift, plus 5 preset JSON files. The engine converts a photo into a retro-styled dithered image matching the color constraints of classic hardware.

**What's included (ready to drop into an iOS project):**
- `DitherEngine/` — 6 Swift files: the complete algorithmic layer with zero iOS dependencies
- `Presets/` — 5 JSON preset files for different retro systems

**What the iOS agent needs to build (integration layer):**
- `UIImage` ↔ pixel buffer conversion
- Preset JSON loading from app bundle
- `async`/`await` wrapper for background processing
- SwiftUI preset picker and image display

## The 5 Presets

| Preset | Resolution | Colors | Palette Reduction | Aesthetic |
|--------|-----------|--------|-------------------|-----------|
| Game Boy | 160×144 | 4 | No (fixed green) | Classic green LCD |
| NES | 160×96 | 4 | Yes (64→4 per image) | Varies by photo |
| Virtual Boy | 256×256 | 4 | No (fixed red) | Red monochrome LED |
| Apple II | 140×192 | 16 | No (fixed) | Warm 80s micro palette |
| BBC Micro | 160×256 | 8 | No (fixed 1-bit RGB) | Bold primary colors |

**NES is the only preset that uses palette reduction.** The reducer picks the 4 best colors from the 64-color NES palette for each specific input image (a sunset gets reds/oranges, a forest gets greens).

## Pixel Format

All pixel data uses packed `UInt32` in **internal format**:
```
bits [7:0]   = Red   (0-255)
bits [15:8]  = Green (0-255)
bits [23:16] = Blue  (0-255)
bits [31:24] = Alpha (always 0xFF)
```

This matches the TypeScript source (`src/settings/palettes.ts`):
```typescript
function RGB(r, g, b) {
    return ((r & 0xff) << 0) | ((g & 0xff) << 8) | ((b & 0xff) << 16);
}
```

Preset JSON uses standard CSS `#RRGGBB` hex strings. The `DitherPreset.parsedPalette()` method handles conversion to internal format.

**CGImage conversion note:** iOS `CGBitmapContext` with `kCGImageAlphaPremultipliedLast` and `kCGBitmapByteOrder32Little` produces RGBA byte order which matches the internal format when read as `UInt32` on little-endian ARM. See the integration section below.

## Architecture

```
DitherEngine/
├── DitherPreset.swift         Codable preset model + palette parsing
├── ColorFunctions.swift       Perceptual/absolute/max color distance
├── DitherKernels.swift        Floyd-Steinberg, Atkinson, Sierra, etc.
├── PaletteReducer.swift       K-means palette reduction (for NES)
├── DitherCanvas.swift         Core error-diffusion dithering loop
└── DitherEngine.swift         Top-level orchestrator (entry point)

Presets/
├── gb.json                    Game Boy Classic
├── nes.json                   NES (64-color, reduces to 4)
├── virtualboy.json            Virtual Boy (4 red shades)
├── apple2dblhires.json        Apple II Double-Hires
└── bbcmicro.json              BBC Micro Mode 2
```

## How the Algorithm Works

### Error Diffusion Dithering

Source: `src/dither/basecanvas.ts` → `DitherCanvas.swift`

For each pixel (scanned in serpentine order, alternating left→right and right→left per row):

1. **Apply accumulated error** to the reference pixel color (clamped 0-255)
2. **Find the closest palette color** using the perceptual distance function
3. **Compute the residual error** (difference between adjusted pixel and chosen color)
4. **Distribute error** to neighboring pixels using the kernel weights (e.g., Floyd-Steinberg distributes 7/16 right, 3/16 down-left, 5/16 down, 1/16 down-right)
5. **Record the choice** and write the output pixel

### Iterative Convergence

Source: `src/dither/dithertron.ts` → `DitherCanvas.run()`

The algorithm runs multiple passes (up to 100), with annealing:
- **Noise** starts high and halves each iteration (helps break ties early)
- **Diffuse** dampens after iteration 5 (converges toward final state)
- **Error threshold** increases over time (stops changing pixels that are "close enough")
- Stops when **zero changes** occur or max iterations reached

Most images converge in 15-40 iterations.

### Palette Reduction (NES only)

Source: `src/common/color.ts:28-97` → `PaletteReducer.swift`

K-means-inspired algorithm:
1. Start with N evenly-spaced palette indices as centroids
2. Scan image pixels with error accumulation (simulates dithering)
3. Each pixel votes for its closest centroid
4. Move centroids toward their mean color (snapping to nearest palette entry)
5. Repeat until stable or 10 iterations
6. Return N palette colors sorted by intensity

## iOS Integration Guide

### 1. UIImage → Pixel Buffer

```swift
import UIKit
import CoreGraphics

extension UIImage {
    /// Convert to pixel array in internal UInt32 format, scaled to target size.
    func toPixelBuffer(width: Int, height: Int) -> [UInt32]? {
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        var pixels = [UInt32](repeating: 0, count: width * height)

        guard let context = CGContext(
            data: &pixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: colorSpace,
            // This combination produces RGBA byte order on little-endian,
            // which matches our internal UInt32 format (R in low byte).
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue |
                        CGBitmapInfo.byteOrder32Little.rawValue
        ) else { return nil }

        // Draw scaled image into context
        context.interpolationQuality = .high
        context.draw(self.cgImage!, in: CGRect(x: 0, y: 0,
                                                width: width, height: height))
        return pixels
    }
}
```

### 2. Pixel Buffer → UIImage

```swift
extension UIImage {
    /// Create UIImage from internal UInt32 pixel buffer.
    static func fromPixelBuffer(_ pixels: [UInt32], width: Int, height: Int) -> UIImage? {
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        var mutablePixels = pixels

        guard let context = CGContext(
            data: &mutablePixels,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue |
                        CGBitmapInfo.byteOrder32Little.rawValue
        ),
        let cgImage = context.makeImage()
        else { return nil }

        return UIImage(cgImage: cgImage)
    }
}
```

### 3. Async Wrapper

```swift
func applyDitherPreset(
    to image: UIImage,
    preset: DitherPreset
) async -> UIImage? {
    return await Task.detached(priority: .userInitiated) {
        guard let pixels = image.toPixelBuffer(
            width: preset.width,
            height: preset.height
        ) else { return nil }

        let result = DitherEngine.dither(
            sourcePixels: pixels,
            preset: preset,
            progress: { iteration, max, isFinal in
                // Optional: post progress to MainActor for UI update
                return true // return false to cancel
            }
        )

        return UIImage.fromPixelBuffer(
            result.pixels,
            width: result.width,
            height: result.height
        )
    }.value
}
```

### 4. Loading Presets from Bundle

```swift
func loadPresets() -> [DitherPreset] {
    let names = ["gb", "nes", "virtualboy", "apple2dblhires", "bbcmicro"]
    return names.compactMap { name in
        guard let url = Bundle.main.url(forResource: name, withExtension: "json"),
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder().decode(DitherPreset.self, from: data)
    }
}
```

### 5. Display Scaling

The dithered output is small (e.g., 160×144 for Game Boy). When displaying:
- Use **nearest-neighbor** interpolation to preserve crisp pixels:
  ```swift
  Image(uiImage: ditheredImage)
      .interpolation(.none)
      .resizable()
      .aspectRatio(contentMode: .fit)
  ```
- Apply `pixelScaleX` from the preset for correct aspect ratio (e.g., Game Boy pixels are slightly wider than tall)

## Source Code Mapping

| Swift File | TypeScript Source | Key Functions |
|-----------|-----------------|---------------|
| `ColorFunctions.swift` | `src/common/color.ts` | `perceptualDistance`, `closestPaletteIndex`, `rgbDiff`, `packRGB` |
| `DitherKernels.swift` | `src/dither/kernels.ts` | `DitherKernels.floyd`, `.atkinson`, etc. |
| `PaletteReducer.swift` | `src/common/color.ts:28-97` | `reducePalette()` |
| `DitherCanvas.swift` | `src/dither/basecanvas.ts` | `DitherCanvas.update()`, `.iterate()`, `.run()` |
| `DitherEngine.swift` | `src/dither/dithertron.ts` | `DitherEngine.dither()` |
| `DitherPreset.swift` | `src/common/types.ts` | `DitherPreset`, `.parsedPalette()` |

## What Was Intentionally Omitted

- **Block-constrained canvases** (`CommonBlockParamDitherCanvas`, `SNES_Canvas`): Not needed. Virtual Boy uses `SNES_Canvas` in the web tool, but with 4 colors in a 4-color palette the block constraint is vacuous. All 5 presets work correctly with basic error diffusion.
- **Export formats** (`toNative`, `exportFormat`): No ROM/native output needed — the iOS app just displays the dithered image.
- **FLI bug logic, ZX Spectrum bright/dark, Intellivision color stack**: System-specific features not relevant to the 5 chosen presets.
- **GIF animation**: Single-frame only for iOS.
- **Hue error function**: Rarely used, can be added later if needed.
- **Web Worker threading**: Replaced by Swift `async`/`await`.
