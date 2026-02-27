// DitherKernels.swift
// Dithertron iOS Port — Error diffusion kernel definitions
//
// Direct translation of src/dither/kernels.ts
// Each kernel entry is (dx, dy, weight) where:
//   dx/dy = offset from current pixel to distribute error to
//   weight = fraction of error to distribute (all weights sum to ~1.0 or less)

import Foundation

struct KernelEntry {
    let dx: Int
    let dy: Int
    let weight: Float
}

typealias DitherKernel = [KernelEntry]

enum DitherKernels {

    /// Floyd-Steinberg (most common, good general-purpose)
    /// kernels.ts:2
    static let floyd: DitherKernel = [
        KernelEntry(dx:  1, dy: 0, weight: 7.0 / 16.0),
        KernelEntry(dx: -1, dy: 1, weight: 3.0 / 16.0),
        KernelEntry(dx:  0, dy: 1, weight: 5.0 / 16.0),
        KernelEntry(dx:  1, dy: 1, weight: 1.0 / 16.0),
    ]

    /// False Floyd-Steinberg (simplified, faster)
    /// kernels.ts:3
    static let falsefloyd: DitherKernel = [
        KernelEntry(dx: 1, dy: 0, weight: 3.0 / 8.0),
        KernelEntry(dx: 0, dy: 1, weight: 3.0 / 8.0),
        KernelEntry(dx: 1, dy: 1, weight: 2.0 / 8.0),
    ]

    /// Atkinson (only distributes 6/8 of error — gives a lighter, more contrasty look)
    /// kernels.ts:4
    static let atkinson: DitherKernel = [
        KernelEntry(dx:  1, dy: 0, weight: 1.0 / 6.0),
        KernelEntry(dx:  2, dy: 0, weight: 1.0 / 6.0),
        KernelEntry(dx: -1, dy: 1, weight: 1.0 / 6.0),
        KernelEntry(dx:  0, dy: 1, weight: 1.0 / 6.0),
        KernelEntry(dx:  1, dy: 1, weight: 1.0 / 6.0),
        KernelEntry(dx:  0, dy: 2, weight: 1.0 / 6.0),
    ]

    /// Sierra Two-Row
    /// kernels.ts:5
    static let sierra2: DitherKernel = [
        KernelEntry(dx:  1, dy: 0, weight: 4.0 / 16.0),
        KernelEntry(dx:  2, dy: 0, weight: 3.0 / 16.0),
        KernelEntry(dx: -2, dy: 1, weight: 1.0 / 16.0),
        KernelEntry(dx: -1, dy: 1, weight: 2.0 / 16.0),
        KernelEntry(dx:  0, dy: 1, weight: 3.0 / 16.0),
        KernelEntry(dx:  1, dy: 1, weight: 2.0 / 16.0),
        KernelEntry(dx:  2, dy: 1, weight: 1.0 / 16.0),
    ]

    /// Sierra Lite
    /// kernels.ts:6
    static let sierralite: DitherKernel = [
        KernelEntry(dx:  1, dy: 0, weight: 2.0 / 4.0),
        KernelEntry(dx: -1, dy: 1, weight: 1.0 / 4.0),
        KernelEntry(dx:  0, dy: 1, weight: 1.0 / 4.0),
    ]

    /// Look up a kernel by name (matching the preset JSON "kernel" field).
    static func kernel(named name: String) -> DitherKernel {
        switch name {
        case "floyd":      return floyd
        case "falsefloyd": return falsefloyd
        case "atkinson":   return atkinson
        case "sierra2":    return sierra2
        case "sierralite": return sierralite
        default:           return floyd
        }
    }
}
