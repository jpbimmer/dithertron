/**
 * Dimension calculation utilities for aspect ratio matching.
 *
 * These functions calculate expanded canvas dimensions that match
 * the source image aspect ratio while respecting system constraints.
 */

import { DithertronSettings } from './types';

export interface ExpandedDimensions {
    width: number;
    height: number;
    // The original native dimensions for reference
    nativeWidth: number;
    nativeHeight: number;
}

export interface SourceDimensions {
    width: number;
    height: number;
}

/**
 * Get the block size for a system (minimum granularity for dimension changes).
 * Uses the largest block/cell constraint, or 1 if no constraints.
 */
export function getBlockSize(settings: DithertronSettings): { w: number; h: number } {
    let blockW = 1;
    let blockH = 1;

    // Check block constraints
    if (settings.block) {
        blockW = Math.max(blockW, settings.block.w || 1);
        blockH = Math.max(blockH, settings.block.h || 1);
    }

    // Check cell constraints
    if (settings.cell) {
        blockW = Math.max(blockW, settings.cell.w || 1);
        blockH = Math.max(blockH, settings.cell.h || 1);
    }

    // Check cb (color block) constraints
    if (settings.cb) {
        blockW = Math.max(blockW, settings.cb.w || 1);
        blockH = Math.max(blockH, settings.cb.h || 1);
    }

    return { w: blockW, h: blockH };
}

/**
 * Round a dimension up to the nearest block boundary.
 */
export function roundUpToBlock(dimension: number, blockSize: number): number {
    return Math.ceil(dimension / blockSize) * blockSize;
}

/**
 * Calculate the effective aspect ratio of the system's native resolution,
 * accounting for non-square pixels (scaleX).
 */
export function getSystemAspectRatio(settings: DithertronSettings): number {
    const scaleX = settings.scaleX || 1;
    return (settings.width * scaleX) / settings.height;
}

/**
 * Calculate the aspect ratio of the source image.
 */
export function getSourceAspectRatio(source: SourceDimensions): number {
    return source.width / source.height;
}

/**
 * Calculate expanded canvas dimensions to match the source image aspect ratio.
 *
 * Rules:
 * - Always expand (never shrink) from native dimensions
 * - If source is wider than native: expand width
 * - If source is taller than native: expand height
 * - Round expanded dimension up to block boundary
 * - Account for scaleX (non-square pixels) when comparing aspect ratios
 *
 * @param settings - The target system settings
 * @param source - The source image dimensions
 * @returns Expanded dimensions that match source aspect ratio
 */
export function calculateExpandedDimensions(
    settings: DithertronSettings,
    source: SourceDimensions
): ExpandedDimensions {
    const nativeWidth = settings.width;
    const nativeHeight = settings.height;
    const scaleX = settings.scaleX || 1;

    // Get block size constraints
    const block = getBlockSize(settings);

    // Calculate aspect ratios
    // Native aspect ratio accounts for non-square pixels
    const nativeAspect = (nativeWidth * scaleX) / nativeHeight;
    const sourceAspect = getSourceAspectRatio(source);

    let expandedWidth = nativeWidth;
    let expandedHeight = nativeHeight;

    if (sourceAspect > nativeAspect) {
        // Source is wider than native - expand width
        // Calculate width needed to match source aspect ratio at native height
        // sourceAspect = (expandedWidth * scaleX) / nativeHeight
        // expandedWidth = (sourceAspect * nativeHeight) / scaleX
        expandedWidth = (sourceAspect * nativeHeight) / scaleX;
        expandedWidth = roundUpToBlock(expandedWidth, block.w);
        // Ensure we don't shrink
        expandedWidth = Math.max(expandedWidth, nativeWidth);
    } else if (sourceAspect < nativeAspect) {
        // Source is taller than native - expand height
        // Calculate height needed to match source aspect ratio at native width
        // sourceAspect = (nativeWidth * scaleX) / expandedHeight
        // expandedHeight = (nativeWidth * scaleX) / sourceAspect
        expandedHeight = (nativeWidth * scaleX) / sourceAspect;
        expandedHeight = roundUpToBlock(expandedHeight, block.h);
        // Ensure we don't shrink
        expandedHeight = Math.max(expandedHeight, nativeHeight);
    }
    // If aspects are equal, no expansion needed

    return {
        width: Math.round(expandedWidth),
        height: Math.round(expandedHeight),
        nativeWidth,
        nativeHeight
    };
}

/**
 * Check if the expanded dimensions are different from native.
 */
export function isExpanded(dims: ExpandedDimensions): boolean {
    return dims.width !== dims.nativeWidth || dims.height !== dims.nativeHeight;
}

/**
 * Get a human-readable description of the expansion.
 */
export function getExpansionDescription(dims: ExpandedDimensions): string {
    if (!isExpanded(dims)) {
        return `${dims.width} x ${dims.height} (native)`;
    }
    return `${dims.width} x ${dims.height} (expanded from ${dims.nativeWidth} x ${dims.nativeHeight})`;
}
