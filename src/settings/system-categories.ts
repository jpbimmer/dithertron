/**
 * System Categories for the tabbed system selector UI.
 * Defines how systems are organized into Defaults, Expanded, and Non-Standard tabs.
 * See SYSTEM_CATEGORIES.md for the source of this organization.
 */

export interface SystemButton {
    id: string;
    label: string;
    systemId: string;
    subSystems?: string[];
}

export interface SystemCategory {
    id: 'defaults' | 'expanded' | 'defunct';
    label: string;
    systems: SystemButton[];
}

export const SYSTEM_CATEGORIES: SystemCategory[] = [
    {
        id: 'defaults',
        label: 'Defaults',
        systems: [
            {
                id: 'nes-group',
                label: 'NES',
                systemId: 'nes4f',
                subSystems: ['nes5f', 'nes.2bpp', 'nes', 'nes.1bpp']
            },
            {
                id: 'snes-group',
                label: 'SNES',
                systemId: 'snes.3bpp',
                subSystems: ['snes.4bpp', 'snes.8bpp', 'snes.mode7', 'snes.8bpp.direct']
            },
            {
                id: 'virtualboy',
                label: 'Virtual Boy',
                systemId: 'virtualboy'
            },
            {
                id: 'gb',
                label: 'Game Boy',
                systemId: 'gb'
            },
            {
                id: 'genesis-group',
                label: 'Genesis',
                systemId: 'genesis',
                subSystems: ['sms', 'sms-gg']
            },
            {
                id: 'williams',
                label: 'Williams',
                systemId: 'williams'
            },
            {
                id: 'pce',
                label: 'PC Engine',
                systemId: 'pce.256x240'
            },
            {
                id: 'bbc',
                label: 'BBC Micro',
                systemId: 'bbcmicro.mode2'
            },
            {
                id: 'appleiigs-group',
                label: 'Apple IIGS',
                systemId: 'appleiigs.320.16',
                subSystems: ['apple2.dblhires', 'mac']
            },
            {
                id: 'cga',
                label: 'PC CGA',
                systemId: 'x86.cga.04h.1'
            }
        ]
    },
    {
        id: 'expanded',
        label: 'Expanded',
        systems: [
            {
                id: 'c64-multi-group',
                label: 'C-64 Multi',
                systemId: 'c64.multi',
                subSystems: ['c64.multi.fli', 'c64.multi.fli.bug', 'c64.multi.fli.blank.left', 'c64.multi.fli.blank']
            },
            {
                id: 'c64-hires-group',
                label: 'C-64 Hires',
                systemId: 'c64.hires',
                subSystems: ['c64.hires.fli', 'c64.hires.fli.bug', 'c64.hires.fli.blank']
            },
            {
                id: 'msx',
                label: 'MSX/Coleco',
                systemId: 'msx'
            },
            {
                id: 'apple2-hires',
                label: 'Apple ][ Hires',
                systemId: 'apple2.hires'
            },
            {
                id: 'atari-antic',
                label: 'Atari ANTIC',
                systemId: 'atari8.d'
            },
            {
                id: 'astrocade',
                label: 'Bally Astrocade',
                systemId: 'astrocade'
            },
            {
                id: 'zx-group',
                label: 'ZX Spectrum',
                systemId: 'zx',
                subSystems: ['zx.dark', 'zx.bright', 'zx.dark.bright', 'zx.bright.dark']
            },
            {
                id: 'cpc-mode0',
                label: 'Amstrad CPC (0)',
                systemId: 'cpc.mode0'
            },
            {
                id: 'cpc-mode1',
                label: 'Amstrad CPC (1)',
                systemId: 'cpc.mode1'
            },
            {
                id: 'neogeo-pocket',
                label: 'NEO Geo Pocket',
                systemId: 'neo.geopocket'
            },
            {
                id: 'stic-group',
                label: 'Intellivision',
                systemId: 'stic.stack.grom',
                subSystems: ['stic.stack.gromram', 'stic.stack.gromram.single', 'stic.stack.grom.single']
            },
            {
                id: 'atari7800-160a',
                label: 'Atari 7800 (A)',
                systemId: 'atari7800.160a'
            },
            {
                id: 'atari7800-160b',
                label: 'Atari 7800 (B)',
                systemId: 'atari7800.160b'
            },
            {
                id: 'cga-05h-group',
                label: 'PC CGA (05h)',
                systemId: 'x86.cga.05h.B',
                subSystems: ['x86.cga.04h.1B', 'x86.cga.04h.2', 'x86.cga.04h.2B', 'x86.cga.05h']
            },
            {
                id: 'ega-group',
                label: 'PC EGA',
                systemId: 'x86.ega.0dh',
                subSystems: ['x86.ega.10h']
            },
            {
                id: 'pico8',
                label: 'PICO-8',
                systemId: 'pico8'
            },
            {
                id: 'tic80',
                label: 'TIC-80',
                systemId: 'tic80'
            },
            {
                id: 'amiga-lores',
                label: 'Amiga',
                systemId: 'amiga.lores'
            },
            {
                id: 'amiga-ham6',
                label: 'Amiga HAM6',
                systemId: 'amiga.lores.ham6'
            },
            {
                id: 'cx16-lores',
                label: 'CX16 Lores',
                systemId: 'cx16.lores'
            },
            {
                id: 'cx16-hires',
                label: 'CX16 Hires',
                systemId: 'cx16.hires'
            },
            {
                id: 'atarist',
                label: 'Atari ST',
                systemId: 'atarist'
            },
            {
                id: 'mc6847-cg2',
                label: 'MC6847 (CG2)',
                systemId: 'MC6847.CG2.palette0'
            },
            {
                id: 'mc6847-cg6-group',
                label: 'MC6847 (CG6)',
                systemId: 'MC6847.CG6.palette0',
                subSystems: ['MC6847.CG2.palette1', 'MC6847.CG3.palette0', 'MC6847.CG3.palette1', 'MC6847.CG6.palette1']
            }
        ]
    },
    {
        id: 'defunct',
        label: 'Defunct',
        systems: [
            {
                id: 'gg-4pp',
                label: 'Game Gear (4bpp)',
                systemId: 'gg.4pp'
            },
            {
                id: 'stic-gram-single',
                label: 'STIC (GRAM Single)',
                systemId: 'stic.stack.gram.single'
            },
            {
                id: 'stic-fgbg',
                label: 'STIC (FGBG)',
                systemId: 'stic'
            },
            {
                id: 'stic-gram-stack',
                label: 'STIC (GRAM Stack)',
                systemId: 'stic.stack.gram'
            },
            {
                id: 'vcs-48',
                label: 'Atari VCS (48x48)',
                systemId: 'vcs.48'
            },
            {
                id: 'phomemo-landscape',
                label: 'Phomemo (Land)',
                systemId: 'phememo-d30.landscape'
            },
            {
                id: 'phomemo-portrait',
                label: 'Phomemo (Port)',
                systemId: 'phememo-d30.portrait'
            },
            {
                id: 'atari-antic-f10',
                label: 'ANTIC (F/10)',
                systemId: 'atari8.f.10'
            },
            {
                id: 'vcs',
                label: 'Atari VCS',
                systemId: 'vcs'
            },
            {
                id: 'vcs-color',
                label: 'Atari VCS (Color)',
                systemId: 'vcs.color'
            },
            {
                id: 'channelf',
                label: 'Channel F',
                systemId: 'channelf'
            },
            {
                id: 'apple2-lores',
                label: 'Apple ][ (Lores)',
                systemId: 'apple2.lores'
            },
            {
                id: 'compucolor',
                label: 'Compucolor',
                systemId: 'compucolor'
            },
            {
                id: 'teletext',
                label: 'Teletext',
                systemId: 'teletext'
            },
            {
                id: 'vic20-hires',
                label: 'VIC-20 Hires',
                systemId: 'vic20.hires'
            },
            {
                id: 'vic20-multi',
                label: 'VIC-20 Multi',
                systemId: 'vic20.multi'
            }
        ]
    }
];

/**
 * Find which category a system belongs to (by systemId).
 * Returns the category and button info, or null if not found.
 */
export function findSystemCategory(systemId: string): {
    category: SystemCategory;
    button: SystemButton;
    isSubSystem: boolean;
    parentButton?: SystemButton;
} | null {
    for (const category of SYSTEM_CATEGORIES) {
        for (const button of category.systems) {
            if (button.systemId === systemId) {
                return { category, button, isSubSystem: false };
            }
            if (button.subSystems?.includes(systemId)) {
                return { category, button: {
                    id: systemId,
                    label: systemId,
                    systemId
                }, isSubSystem: true, parentButton: button };
            }
        }
    }
    return null;
}

/**
 * Get all system IDs in a category (including sub-systems).
 */
export function getCategorySystemIds(categoryId: string): string[] {
    const category = SYSTEM_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return [];

    const ids: string[] = [];
    for (const button of category.systems) {
        ids.push(button.systemId);
        if (button.subSystems) {
            ids.push(...button.subSystems);
        }
    }
    return ids;
}

/**
 * Get all system IDs across all categories (for validation).
 */
export function getAllCategorizedSystemIds(): string[] {
    const ids: string[] = [];
    for (const category of SYSTEM_CATEGORIES) {
        ids.push(...getCategorySystemIds(category.id));
    }
    return ids;
}
