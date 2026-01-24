import { t } from "tap";
import { SYSTEM_LOOKUP, SYSTEMS } from "../../src/settings/systems";
import {
    SYSTEM_CATEGORIES,
    getAllCategorizedSystemIds,
    findSystemCategory,
    getCategorySystemIds
} from "../../src/settings/system-categories";

t.test("All categorized system IDs exist in SYSTEM_LOOKUP", async t => {
    const categorizedIds = getAllCategorizedSystemIds();
    const invalidIds: string[] = [];

    for (const id of categorizedIds) {
        if (!SYSTEM_LOOKUP[id]) {
            invalidIds.push(id);
        }
    }

    t.equal(invalidIds.length, 0, `All system IDs should exist. Invalid: ${invalidIds.join(', ')}`);
    t.end();
});

t.test("No duplicate system IDs across categories", async t => {
    const categorizedIds = getAllCategorizedSystemIds();
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const id of categorizedIds) {
        if (seen.has(id)) {
            duplicates.push(id);
        }
        seen.add(id);
    }

    t.equal(duplicates.length, 0, `No duplicates should exist. Found: ${duplicates.join(', ')}`);
    t.end();
});

t.test("Each category has expected structure", async t => {
    t.equal(SYSTEM_CATEGORIES.length, 3, "Should have 3 categories");

    const categoryIds = SYSTEM_CATEGORIES.map(c => c.id);
    t.ok(categoryIds.includes('defaults'), "Should have 'defaults' category");
    t.ok(categoryIds.includes('expanded'), "Should have 'expanded' category");
    t.ok(categoryIds.includes('defunct'), "Should have 'defunct' category");

    for (const category of SYSTEM_CATEGORIES) {
        t.ok(category.label, `Category ${category.id} should have a label`);
        t.ok(category.systems.length > 0, `Category ${category.id} should have systems`);

        for (const button of category.systems) {
            t.ok(button.id, `Button should have an id`);
            t.ok(button.label, `Button should have a label`);
            t.ok(button.systemId, `Button should have a systemId`);

            if (button.subSystems) {
                t.ok(button.subSystems.length > 0, `SubSystems array should not be empty if present`);
            }
        }
    }

    t.end();
});

t.test("findSystemCategory works correctly", async t => {
    // Test finding a main system (nes4f is now the default for NES group)
    const nesResult = findSystemCategory('nes4f');
    t.ok(nesResult, "Should find nes4f");
    t.equal(nesResult?.category.id, 'defaults', "nes4f should be in defaults");
    t.equal(nesResult?.isSubSystem, false, "nes4f is not a sub-system");

    // Test finding a sub-system
    const nesSub = findSystemCategory('nes.2bpp');
    t.ok(nesSub, "Should find nes.2bpp");
    t.equal(nesSub?.isSubSystem, true, "nes.2bpp is a sub-system");
    t.ok(nesSub?.parentButton, "Should have parent button");
    t.equal(nesSub?.parentButton?.systemId, 'nes4f', "Parent should be nes4f");

    // Test system in expanded category
    const c64Result = findSystemCategory('c64.multi');
    t.ok(c64Result, "Should find c64.multi");
    t.equal(c64Result?.category.id, 'expanded', "c64.multi should be in expanded");

    // Test system in defunct category
    const vcsResult = findSystemCategory('vcs');
    t.ok(vcsResult, "Should find vcs");
    t.equal(vcsResult?.category.id, 'defunct', "vcs should be in defunct");

    // Test non-existent system
    const notFound = findSystemCategory('nonexistent');
    t.equal(notFound, null, "Should return null for non-existent system");

    t.end();
});

t.test("getCategorySystemIds returns correct IDs", async t => {
    const defaultsIds = getCategorySystemIds('defaults');
    t.ok(defaultsIds.includes('nes4f'), "defaults should include nes4f (primary)");
    t.ok(defaultsIds.includes('nes5f'), "defaults should include nes5f (sub-system)");
    t.ok(defaultsIds.includes('nes.2bpp'), "defaults should include sub-system nes.2bpp");
    t.ok(defaultsIds.includes('gb'), "defaults should include gb");

    const expandedIds = getCategorySystemIds('expanded');
    t.ok(expandedIds.includes('c64.multi'), "expanded should include c64.multi");
    t.ok(expandedIds.includes('zx'), "expanded should include zx");

    const defunctIds = getCategorySystemIds('defunct');
    t.ok(defunctIds.includes('vcs'), "defunct should include vcs");
    t.ok(defunctIds.includes('teletext'), "defunct should include teletext");

    const invalidIds = getCategorySystemIds('invalid');
    t.equal(invalidIds.length, 0, "Invalid category should return empty array");

    t.end();
});
