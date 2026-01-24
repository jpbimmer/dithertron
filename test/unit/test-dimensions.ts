import { t } from "tap";
import {
    calculateExpandedDimensions,
    getBlockSize,
    roundUpToBlock,
    getSystemAspectRatio,
    getSourceAspectRatio,
    isExpanded,
    getExpansionDescription
} from "../../src/common/dimensions";
import { DithertronSettings } from "../../src/common/types";

// Helper to create minimal mock settings
function mockSettings(overrides: Partial<DithertronSettings>): DithertronSettings {
    return {
        id: 'test',
        name: 'Test System',
        width: 320,
        height: 200,
        conv: 'Direct',
        pal: [0],
        ...overrides
    };
}

t.test("getBlockSize returns correct values", async t => {
    // No block constraints
    const noBlock = mockSettings({});
    t.same(getBlockSize(noBlock), { w: 1, h: 1 }, "No constraints returns 1x1");

    // Block constraint only
    const withBlock = mockSettings({ block: { w: 8, h: 8, colors: 2 } });
    t.same(getBlockSize(withBlock), { w: 8, h: 8 }, "Block constraint respected");

    // Cell constraint only
    const withCell = mockSettings({ cell: { w: 4, h: 4 } as any });
    t.same(getBlockSize(withCell), { w: 4, h: 4 }, "Cell constraint respected");

    // Both - should use max of each dimension
    const withBoth = mockSettings({
        block: { w: 4, h: 8, colors: 2 },
        cell: { w: 8, h: 4 } as any
    });
    t.same(getBlockSize(withBoth), { w: 8, h: 8 }, "Max of block and cell used");

    t.end();
});

t.test("roundUpToBlock rounds correctly", async t => {
    t.equal(roundUpToBlock(10, 8), 16, "10 rounds up to 16 for block size 8");
    t.equal(roundUpToBlock(16, 8), 16, "16 stays at 16 for block size 8");
    t.equal(roundUpToBlock(17, 8), 24, "17 rounds up to 24 for block size 8");
    t.equal(roundUpToBlock(100, 1), 100, "Block size 1 has no effect");
    t.equal(roundUpToBlock(7, 4), 8, "7 rounds up to 8 for block size 4");
    t.end();
});

t.test("getSystemAspectRatio accounts for scaleX", async t => {
    // Standard 320x200 with no scaleX
    const standard = mockSettings({ width: 320, height: 200 });
    t.equal(getSystemAspectRatio(standard), 1.6, "320x200 = 1.6 aspect");

    // With scaleX
    const withScaleX = mockSettings({ width: 320, height: 200, scaleX: 0.5 });
    t.equal(getSystemAspectRatio(withScaleX), 0.8, "320x200 with scaleX 0.5 = 0.8 aspect");

    // Square pixels
    const square = mockSettings({ width: 256, height: 256 });
    t.equal(getSystemAspectRatio(square), 1.0, "256x256 = 1.0 aspect");

    t.end();
});

t.test("getSourceAspectRatio calculates correctly", async t => {
    t.equal(getSourceAspectRatio({ width: 1600, height: 1200 }), 4/3, "1600x1200 = 4:3");
    t.equal(getSourceAspectRatio({ width: 1920, height: 1080 }), 16/9, "1920x1080 = 16:9");
    t.equal(getSourceAspectRatio({ width: 1000, height: 1000 }), 1, "1000x1000 = 1:1");
    t.end();
});

t.test("calculateExpandedDimensions - source matches native aspect", async t => {
    // 320x200 is 1.6 aspect, source 1600x1000 is also 1.6
    const settings = mockSettings({ width: 320, height: 200 });
    const result = calculateExpandedDimensions(settings, { width: 1600, height: 1000 });

    t.equal(result.width, 320, "Width stays at native");
    t.equal(result.height, 200, "Height stays at native");
    t.equal(result.nativeWidth, 320, "Native width recorded");
    t.equal(result.nativeHeight, 200, "Native height recorded");
    t.end();
});

t.test("calculateExpandedDimensions - source is taller (4:3 on 320x200)", async t => {
    // 320x200 is 1.6:1, source 4:3 (1.33:1) is taller - expand height
    const settings = mockSettings({ width: 320, height: 200 });
    const result = calculateExpandedDimensions(settings, { width: 1600, height: 1200 });

    t.equal(result.width, 320, "Width stays at native");
    t.equal(result.height, 240, "Height expanded to match 4:3");
    // Verify aspect: 320/240 = 1.33... = 4:3
    t.ok(Math.abs(result.width / result.height - 4/3) < 0.01, "Aspect ratio matches 4:3");
    t.end();
});

t.test("calculateExpandedDimensions - source is wider (16:9 on 320x200)", async t => {
    // 320x200 is 1.6:1, source 16:9 (1.78:1) is wider - expand width
    const settings = mockSettings({ width: 320, height: 200 });
    const result = calculateExpandedDimensions(settings, { width: 1920, height: 1080 });

    t.equal(result.height, 200, "Height stays at native");
    // 16:9 aspect at height 200: width = 200 * (16/9) = 355.56 -> rounds to 356
    t.ok(result.width >= 356, "Width expanded for 16:9");
    // Verify aspect ratio is close to 16:9
    t.ok(Math.abs(result.width / result.height - 16/9) < 0.05, "Aspect ratio close to 16:9");
    t.end();
});

t.test("calculateExpandedDimensions - source is square (1:1 on 320x200)", async t => {
    // 320x200 is 1.6:1, source 1:1 is taller - expand height
    const settings = mockSettings({ width: 320, height: 200 });
    const result = calculateExpandedDimensions(settings, { width: 1000, height: 1000 });

    t.equal(result.width, 320, "Width stays at native");
    t.equal(result.height, 320, "Height expanded to match 1:1");
    t.end();
});

t.test("calculateExpandedDimensions - respects block boundaries", async t => {
    // System with 8x8 block constraint
    const settings = mockSettings({
        width: 256,
        height: 192,
        block: { w: 8, h: 8, colors: 2 }
    });
    // Source that would require non-block-aligned expansion
    const result = calculateExpandedDimensions(settings, { width: 100, height: 100 });

    // 256x192 is 1.33:1, source is 1:1 (taller) - expand height
    // Height needed for 1:1 at width 256: 256 pixels
    // 256 is already block-aligned (256/8 = 32)
    t.equal(result.width, 256, "Width stays at native");
    t.equal(result.height, 256, "Height expanded and block-aligned");
    t.equal(result.height % 8, 0, "Height is multiple of block height");
    t.end();
});

t.test("calculateExpandedDimensions - accounts for scaleX", async t => {
    // System with non-square pixels: 160x200 with scaleX 2 = effective 320x200 (1.6:1)
    const settings = mockSettings({
        width: 160,
        height: 200,
        scaleX: 2
    });
    // Source 4:3 - effective native is 1.6:1, so need to expand height
    const result = calculateExpandedDimensions(settings, { width: 1600, height: 1200 });

    t.equal(result.width, 160, "Width stays at native (pixels, not display)");
    // Effective aspect with scaleX 2: (160 * 2) / height should equal 4/3
    // height = (160 * 2) / (4/3) = 320 * 0.75 = 240
    t.equal(result.height, 240, "Height expanded accounting for scaleX");
    t.end();
});

t.test("calculateExpandedDimensions - never shrinks below native", async t => {
    const settings = mockSettings({ width: 320, height: 200 });

    // Even with a very extreme aspect ratio, should never go below native
    const wideResult = calculateExpandedDimensions(settings, { width: 10000, height: 100 });
    t.ok(wideResult.width >= 320, "Width not shrunk below native");
    t.ok(wideResult.height >= 200, "Height not shrunk below native");

    const tallResult = calculateExpandedDimensions(settings, { width: 100, height: 10000 });
    t.ok(tallResult.width >= 320, "Width not shrunk below native");
    t.ok(tallResult.height >= 200, "Height not shrunk below native");

    t.end();
});

t.test("isExpanded detects expansion correctly", async t => {
    t.equal(isExpanded({ width: 320, height: 200, nativeWidth: 320, nativeHeight: 200 }), false, "No expansion");
    t.equal(isExpanded({ width: 320, height: 240, nativeWidth: 320, nativeHeight: 200 }), true, "Height expanded");
    t.equal(isExpanded({ width: 400, height: 200, nativeWidth: 320, nativeHeight: 200 }), true, "Width expanded");
    t.end();
});

t.test("getExpansionDescription provides readable output", async t => {
    const native = { width: 320, height: 200, nativeWidth: 320, nativeHeight: 200 };
    t.ok(getExpansionDescription(native).includes("native"), "Native case mentions 'native'");

    const expanded = { width: 320, height: 240, nativeWidth: 320, nativeHeight: 200 };
    t.ok(getExpansionDescription(expanded).includes("expanded"), "Expanded case mentions 'expanded'");
    t.ok(getExpansionDescription(expanded).includes("320 x 240"), "Shows expanded dimensions");
    t.ok(getExpansionDescription(expanded).includes("320 x 200"), "Shows native dimensions");

    t.end();
});
