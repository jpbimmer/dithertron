import { SYSTEMS, SYSTEM_LOOKUP } from "../settings/systems";
import { DitherSetting, DithertronSettings, PixelsAvailableMessage, ProcessedFrame, GifFrameData } from "../common/types";
import { SYSTEM_CATEGORIES, findSystemCategory, SystemButton, SystemCategory } from "../settings/system-categories";

import * as exportfuncs from "../export/exportfuncs";
import * as fileviewers from "../export/fileviewers";
import * as kernels from "../dither/kernels";

import Cropper from 'cropperjs';
import { calculateExpandedDimensions, ExpandedDimensions } from '../common/dimensions';
import pica from 'pica';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { EXAMPLE_IMAGES } from "./sampleimages";
import { isGifFile, loadGifFromFile, ParsedAnimatedGif } from "../gif/gifParser";
import { animationState, AnimationStateManager } from "../gif/animationState";
import { exportAnimatedGif } from "../gif/gifEncoder";

var cropper : Cropper;
var cropEnabled = false; // Crop tool is disabled by default

// Current expanded dimensions (may differ from native system dimensions)
var currentExpandedDimensions: ExpandedDimensions | null = null;

// System IDs list for keyboard navigation
var allSystemIds: string[] = [];

// Mutable palette for color picker feature
var currentPalette: Uint32Array | null = null;
var originalPalette: Uint32Array | null = null;
var paletteModified = false;
var optimalPaletteCaptured = false; // Track if we've captured the optimal palette from worker
var paletteLocked = false; // Track if palette is locked (prevents regeneration on crop changes)
var originalPaletteSize = 0; // Track original palette length to identify user-added colors

// Animation state
var isAnimationMode = false;
var animationProcessingAborted = false;

// Batch processing state
var isBatchMode = false;
var batchAborted = false;
var consistentPalette = true; // Use same palette across all frames

// Source GIF playback state
var sourceGifPlayback = {
    isPlaying: false,
    currentFrame: 0,
    timer: null as number | null
};

// Pixel scale state
var currentPixelScale = 1;

var brightSlider = document.getElementById('brightSlider') as HTMLInputElement;
var contrastSlider = document.getElementById('contrastSlider') as HTMLInputElement;
var saturationSlider = document.getElementById('saturationSlider') as HTMLInputElement;
var noiseSlider = document.getElementById('noiseSlider') as HTMLInputElement;
var diffuseSlider = document.getElementById('diffuseSlider') as HTMLInputElement;
var orderedSlider = document.getElementById('orderedSlider') as HTMLInputElement;
var diversitySlider = document.getElementById('diversitySlider') as HTMLInputElement;
var imageUpload = document.getElementById("imageUpload") as HTMLInputElement;
const sourceImage = document.getElementById('srcimage') as HTMLImageElement;
const resizeCanvas = document.getElementById('resizecanvas') as HTMLCanvasElement;
const destCanvas = document.getElementById('destcanvas') as HTMLCanvasElement;
//const cmdline = document.getElementById('cmdline');

class ProxyDithertron {
    worker: Worker;
    settings: DithertronSettings;
    lastPixels: PixelsAvailableMessage;

    constructor() {
        this.newWorker();
    }
    newWorker() {
        // disable old worker
        if (this.worker) this.worker.onmessage = () => {};
        // create a new worker
        this.worker = new Worker("./gen/worker.js");
        this.worker.onmessage = (ev) => {
            var data = ev.data;
            if (data != null) {
                //console.log('recv',data);
                if (data.img != null && this.pixelsAvailable != null) {
                    this.pixelsAvailable(data);
                    this.lastPixels = data;
                }
            }
        };
    }
    setSettings(settings: DithertronSettings) {
        this.settings = settings;
        this.worker.postMessage({ cmd: "setSettings", data: settings });
    }
    setSourceImage(img: Uint32Array) {
        this.worker.postMessage({ cmd: "setSourceImage", data: img });
    }
    restart() {
        this.worker.postMessage({ cmd: "restart" });
    }
    pixelsAvailable: (msg: PixelsAvailableMessage) => void;
}

export const dithertron = new ProxyDithertron();

var filenameLoaded: string;
var presetLoaded: string;
var currentExampleIndex: number = 0;
var currentDitherIndex: number = 0;

const ALL_DITHER_SETTINGS: DitherSetting[] = [
    { name: "Floyd-Steinberg", kernel: kernels.FLOYD },
    { name: "False Floyd", kernel: kernels.FALSEFLOYD },
    { name: "Atkinson", kernel: kernels.ATKINSON },
    { name: "Sierra 2", kernel: kernels.SIERRA2 },
    { name: "Sierra Lite", kernel: kernels.SIERRALITE },
    { name: "Stucki", kernel: kernels.STUCKI },
    { name: "Two-D", kernel: kernels.TWOD },
    { name: "Right", kernel: kernels.RIGHT },
    { name: "Down", kernel: kernels.DOWN },
    { name: "Double Down", kernel: kernels.DOUBLE_DOWN },
    { name: "Diagonal", kernel: kernels.DIAG },
    { name: "Diamond", kernel: kernels.VDIAMOND },
];

const ERROR_FUNCS = [
    { id: 'perceptual', name: "Perceptual" },
    { id: 'hue', name: "Hue-Based" },
    { id: 'dist', name: "Distance" },
    { id: 'max', name: "Maximum" },
];

function populateErrorFuncButtons() {
    const container = $('#errorFuncGroup');
    container.empty();
    ERROR_FUNCS.forEach((func, index) => {
        const btn = $('<button type="button" class="error-func-btn"></button>')
            .text(func.name)
            .attr('data-error-func', func.id);
        if (index === 0) btn.addClass('active');
        container.append(btn);
    });
}

function selectDitherByIndex(index: number) {
    if (index < 0) index = ALL_DITHER_SETTINGS.length - 1;
    if (index >= ALL_DITHER_SETTINGS.length) index = 0;
    currentDitherIndex = index;
    $('#diffMethodLabel').text(ALL_DITHER_SETTINGS[index].name);
    if (isAnimationMode) reprocessAnimation();
    else resetImage();
}

// Track active sidebar tab
var activeSidebarTab: string = 'defaults';
var expandedSidebarButtonId: string | null = null;

function populateSidebarDefaults() {
    const container = $('#sidebarDefaultsButtons');
    container.empty();

    // Only show systems from the 'defaults' category
    const defaultsCategory = SYSTEM_CATEGORIES.find(c => c.id === 'defaults');
    if (!defaultsCategory) return;

    defaultsCategory.systems.forEach(button => {
        const btn = $('<button type="button" class="system-btn"></button>')
            .text(button.label)
            .attr('data-button-id', button.id)
            .attr('data-system-id', button.systemId)
            .attr('data-category', 'defaults');

        if (button.subSystems && button.subSystems.length > 0) {
            btn.append(' <span class="dropdown-arrow"><i class="fa fa-caret-down"></i></span>');
            btn.attr('data-has-subsystems', 'true');
        }

        container.append(btn);
    });
}

function populateSidebarExtended() {
    const container = $('#sidebarExtendedButtons');
    container.empty();

    // Get systems from expanded and defunct categories
    const expandedCategory = SYSTEM_CATEGORIES.find(c => c.id === 'expanded');
    const defunctCategory = SYSTEM_CATEGORIES.find(c => c.id === 'defunct');

    // Collect all system IDs from these categories (including sub-systems)
    const extendedSystemIds = new Set<string>();

    [expandedCategory, defunctCategory].forEach(category => {
        if (category) {
            category.systems.forEach(button => {
                extendedSystemIds.add(button.systemId);
                if (button.subSystems) {
                    button.subSystems.forEach(subId => extendedSystemIds.add(subId));
                }
            });
        }
    });

    // Get the actual systems and sort alphabetically
    const extendedSystems = SYSTEMS
        .filter(sys => sys !== null && extendedSystemIds.has(sys!.id))
        .sort((a, b) => a!.name.localeCompare(b!.name));

    extendedSystems.forEach(sys => {
        if (sys) {
            const btn = $('<button type="button" class="system-btn"></button>')
                .text(sys.name)
                .attr('data-system-id', sys.id);
            container.append(btn);
        }
    });
}

function showSidebarSubSystems(button: SystemButton) {
    // Remove any existing inline sub-system containers
    hideSidebarSubSystems();

    if (button.subSystems && button.subSystems.length > 0) {
        // Include the default system as the first option
        const allSubSystems = [button.systemId, ...button.subSystems];

        // Create inline container for sub-systems
        const inlineContainer = $('<div class="sidebar-sub-systems-inline visible"></div>');

        allSubSystems.forEach(subId => {
            const sys = SYSTEM_LOOKUP[subId];
            if (sys) {
                const subBtn = $('<button type="button" class="sidebar-sub-system-btn"></button>')
                    .text(sys.name)
                    .attr('data-system-id', subId)
                    .attr('data-parent-button-id', button.id);
                inlineContainer.append(subBtn);
            }
        });

        // Insert directly after the parent button
        const parentBtn = $(`#sidebarDefaultsButtons .system-btn[data-button-id="${button.id}"]`);
        parentBtn.addClass('expanded');
        parentBtn.after(inlineContainer);

        expandedSidebarButtonId = button.id;
    }
}

function hideSidebarSubSystems() {
    // Remove any inline sub-system containers
    $('.sidebar-sub-systems-inline').remove();
    $('#sidebarDefaultsButtons .system-btn').removeClass('expanded');
    expandedSidebarButtonId = null;
}

function switchSidebarTab(tabId: string) {
    activeSidebarTab = tabId;
    // Update tab buttons
    $('.sidebar-tab').removeClass('active');
    $(`.sidebar-tab[data-sidebar-tab="${tabId}"]`).addClass('active');

    // Update tab content
    $('.sidebar-tab-content').removeClass('active');
    $(`.sidebar-tab-content[data-sidebar-tab-content="${tabId}"]`).addClass('active');

    // Hide sub-systems when switching tabs
    hideSidebarSubSystems();
}

function filterSidebarSystems(searchTerm: string) {
    const term = searchTerm.toLowerCase().trim();

    // Filter based on active tab
    if (activeSidebarTab === 'defaults') {
        $('#sidebarDefaultsButtons .system-btn').each(function() {
            const btn = $(this);
            const name = btn.text().toLowerCase();
            const matches = !term || name.includes(term);
            btn.toggleClass('d-none', !matches);
        });
        // Hide sub-systems when searching
        if (term) {
            hideSidebarSubSystems();
        }
    } else {
        $('#sidebarExtendedButtons .system-btn').each(function() {
            const btn = $(this);
            const name = btn.text().toLowerCase();
            const matches = !term || name.includes(term);
            btn.toggleClass('d-none', !matches);
        });
    }
}

function updateSidebarDisplay(sys: DithertronSettings) {
    // Update active state in both tabs
    $('.sidebar-tab-content .system-btn').removeClass('active');
    $('.sidebar-sub-system-btn').removeClass('active');
    $(`.sidebar-tab-content .system-btn[data-system-id="${sys.id}"]`).addClass('active');

    // Check if this system is in the defaults tab (via category lookup)
    const found = findSystemCategory(sys.id);
    if (found) {
        // Highlight parent button if this is a sub-system
        if (found.isSubSystem && found.parentButton) {
            $(`#sidebarDefaultsButtons .system-btn[data-button-id="${found.parentButton.id}"]`).addClass('active');
            // Also highlight the sub-system if expanded
            $(`.sidebar-sub-system-btn[data-system-id="${sys.id}"]`).addClass('active');
        } else {
            // Find the button that has this system as its primary
            $(`#sidebarDefaultsButtons .system-btn[data-system-id="${sys.id}"]`).addClass('active');
        }
    }
}

function setupSidebarEvents() {
    // Sidebar tab switching
    $(document).on('click', '.sidebar-tab', function() {
        const tabId = $(this).attr('data-sidebar-tab');
        if (tabId) {
            switchSidebarTab(tabId);
        }
    });

    // Defaults tab - system button clicks with sub-system expansion
    $('#sidebarDefaultsButtons').on('click', '.system-btn', function() {
        const buttonId = $(this).attr('data-button-id');
        const systemId = $(this).attr('data-system-id');
        const hasSubsystems = $(this).attr('data-has-subsystems') === 'true';
        const categoryId = $(this).attr('data-category');

        if (hasSubsystems && categoryId) {
            // Find the button data from categories
            const category = SYSTEM_CATEGORIES.find(c => c.id === categoryId);
            const button = category?.systems.find(b => b.id === buttonId);

            if (button) {
                if (expandedSidebarButtonId === buttonId) {
                    // Already expanded, collapse it
                    hideSidebarSubSystems();
                    return;
                } else {
                    // Expand this button's sub-systems
                    showSidebarSubSystems(button);

                    // Check if current system is already one of this button's systems
                    const allButtonSystems = [button.systemId, ...(button.subSystems || [])];
                    if (allButtonSystems.includes(dithertron.settings.id)) {
                        // Already have a system from this group selected
                        $(`.sidebar-sub-system-btn[data-system-id="${dithertron.settings.id}"]`).addClass('active');
                        return;
                    }
                }
            }
        }

        // Select the system
        if (systemId && SYSTEM_LOOKUP[systemId]) {
            setTargetSystem(SYSTEM_LOOKUP[systemId]);
        }
    });

    // Sub-system button clicks (for inline sub-system containers)
    $('#sidebarDefaultsButtons').on('click', '.sidebar-sub-system-btn', function(e) {
        e.stopPropagation();
        const systemId = $(this).attr('data-system-id');
        if (systemId && SYSTEM_LOOKUP[systemId]) {
            setTargetSystem(SYSTEM_LOOKUP[systemId]);
        }
    });

    // Extended tab - simple system button clicks
    $('#sidebarExtendedButtons').on('click', '.system-btn', function() {
        const systemId = $(this).attr('data-system-id');
        if (systemId && SYSTEM_LOOKUP[systemId]) {
            setTargetSystem(SYSTEM_LOOKUP[systemId]);
        }
    });
}

function toggleSystemSidebar(open: boolean) {
    // Only toggle on mobile (sidebar is always visible on desktop)
    const isMobile = window.innerWidth < 992;
    if (!isMobile) return;

    if (open) {
        $('#systemSidebar').addClass('open');
        $('#systemSidebarBackdrop').addClass('open');
        document.body.style.overflow = 'hidden';
    } else {
        $('#systemSidebar').removeClass('open');
        $('#systemSidebarBackdrop').removeClass('open');
        document.body.style.overflow = '';
    }
}

// Sidebar collapse/expand for desktop
var sidebarCollapsed = false;

function collapseSidebar() {
    sidebarCollapsed = true;
    $('#systemSidebar').addClass('collapsed');
    $('body').addClass('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', 'true');
}

function expandSidebar() {
    sidebarCollapsed = false;
    $('#systemSidebar').removeClass('collapsed');
    $('body').removeClass('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', 'false');
}

function toggleSidebarCollapse() {
    if (sidebarCollapsed) {
        expandSidebar();
    } else {
        collapseSidebar();
    }
}

function initSidebarCollapseState() {
    // Only apply on desktop
    if (window.innerWidth < 992) return;

    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved === 'true') {
        collapseSidebar();
    }
}

function updateCurrentSystemDisplay(sys: DithertronSettings) {
    $('#currentSystemName').text(sys.name);
    $('#currentSystemDisplay').text(sys.name);
    // Update sidebar display
    updateSidebarDisplay(sys);
}

function toggleCropMode() {
    cropEnabled = !cropEnabled;
    $('#cropToggle').toggleClass('active', cropEnabled);

    if (cropper) {
        if (cropEnabled) {
            // Enable cropper handles
            cropper.enable();
        } else {
            // Disable cropper handles and reset to full image
            cropper.clear();
            cropper.disable();
            // Trigger reprocess with full image
            convertImage();
        }
    }
}

// Build list of system IDs for keyboard navigation
function buildSystemIdList() {
    allSystemIds = SYSTEMS.filter(s => s !== null).map(s => s!.id);
}

// Get visible system IDs in the current sidebar tab in visual DOM order
// This traverses the DOM so sub-systems appear immediately after their parent
function getVisibleSystemIds(): string[] {
    const visibleIds: string[] = [];

    if (activeSidebarTab === 'defaults') {
        // Traverse all children of defaults container in order
        // This includes both .system-btn and .sidebar-sub-systems-inline containers
        $('#sidebarDefaultsButtons').children().each(function() {
            const $el = $(this);
            if ($el.hasClass('system-btn') && !$el.hasClass('d-none')) {
                const systemId = $el.attr('data-system-id');
                if (systemId) {
                    visibleIds.push(systemId);
                }
            } else if ($el.hasClass('sidebar-sub-systems-inline')) {
                // Add all sub-system buttons within this expansion
                $el.find('.sidebar-sub-system-btn').each(function() {
                    const systemId = $(this).attr('data-system-id');
                    if (systemId) {
                        visibleIds.push(systemId);
                    }
                });
            }
        });
    } else {
        // Extended tab - get all visible buttons
        $('#sidebarExtendedButtons .system-btn:not(.d-none)').each(function() {
            const systemId = $(this).attr('data-system-id');
            if (systemId) {
                visibleIds.push(systemId);
            }
        });
    }

    return visibleIds;
}

// Track keyboard navigation highlight (separate from selected system)
var keyboardHighlightIndex: number = -1;

// Find the parent button info for a given system ID in the defaults tab
function findParentButtonForSystem(systemId: string): { buttonId: string; button: SystemButton } | null {
    const defaultsCategory = SYSTEM_CATEGORIES.find(c => c.id === 'defaults');
    if (!defaultsCategory) return null;

    for (const button of defaultsCategory.systems) {
        if (button.systemId === systemId) {
            return { buttonId: button.id, button };
        }
        if (button.subSystems?.includes(systemId)) {
            return { buttonId: button.id, button };
        }
    }
    return null;
}

// Get the button ID for a system at the given index in the visible list
function getButtonIdAtIndex(index: number): string | null {
    const visibleIds = getVisibleSystemIds();
    if (index < 0 || index >= visibleIds.length) return null;
    return visibleIds[index];
}

// Update the visual keyboard highlight
function updateKeyboardHighlight() {
    // Remove existing highlight
    $('.system-btn, .sidebar-sub-system-btn').removeClass('keyboard-highlight');

    const systemId = getButtonIdAtIndex(keyboardHighlightIndex);
    if (!systemId) return;

    // Add highlight to the appropriate button
    let btn = $(`.system-btn[data-system-id="${systemId}"]`);
    if (!btn.length) {
        btn = $(`.sidebar-sub-system-btn[data-system-id="${systemId}"]`);
    }
    if (btn.length) {
        btn.addClass('keyboard-highlight');
        btn[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Move keyboard highlight by offset and select system (Up/Down arrows)
function moveKeyboardHighlight(offset: number) {
    const visibleIds = getVisibleSystemIds();
    if (visibleIds.length === 0) return;

    // Initialize highlight to current system if not set
    if (keyboardHighlightIndex < 0) {
        const currentId = dithertron.settings.id;
        keyboardHighlightIndex = visibleIds.indexOf(currentId);
        if (keyboardHighlightIndex < 0) keyboardHighlightIndex = 0;
    }

    let newIndex = keyboardHighlightIndex + offset;

    // Wrap around
    if (newIndex < 0) newIndex = visibleIds.length - 1;
    if (newIndex >= visibleIds.length) newIndex = 0;

    keyboardHighlightIndex = newIndex;
    updateKeyboardHighlight();

    // Immediately select the highlighted system
    selectHighlightedSystem();
}

// Select the currently highlighted system (Enter key)
function selectHighlightedSystem() {
    const systemId = getButtonIdAtIndex(keyboardHighlightIndex);
    if (systemId && SYSTEM_LOOKUP[systemId]) {
        setTargetSystem(SYSTEM_LOOKUP[systemId]);
    }
}

// Expand group at current highlight (Right arrow)
function expandHighlightedGroup() {
    if (activeSidebarTab !== 'defaults') return;

    const systemId = getButtonIdAtIndex(keyboardHighlightIndex);
    if (!systemId) return;

    const parentInfo = findParentButtonForSystem(systemId);
    if (!parentInfo) return;

    const button = parentInfo.button;
    if (button && button.subSystems && button.subSystems.length > 0) {
        if (expandedSidebarButtonId !== button.id) {
            showSidebarSubSystems(button);
            // Update highlight to stay on same item (index may have changed)
            const visibleIds = getVisibleSystemIds();
            keyboardHighlightIndex = visibleIds.indexOf(systemId);
            updateKeyboardHighlight();
        }
    }
}

// Collapse group at current highlight (Left arrow)
function collapseHighlightedGroup() {
    if (activeSidebarTab !== 'defaults') return;

    const systemId = getButtonIdAtIndex(keyboardHighlightIndex);
    if (!systemId) return;

    // Check if we're in a subsystem - if so, find the parent
    const parentInfo = findParentButtonForSystem(systemId);
    if (!parentInfo) return;

    if (expandedSidebarButtonId === parentInfo.buttonId) {
        // Move highlight to parent button before collapsing
        const parentSystemId = parentInfo.button.systemId;
        hideSidebarSubSystems();
        // Update highlight to parent
        const visibleIds = getVisibleSystemIds();
        keyboardHighlightIndex = visibleIds.indexOf(parentSystemId);
        updateKeyboardHighlight();
    }
}

// Clear keyboard highlight when clicking
function clearKeyboardHighlight() {
    keyboardHighlightIndex = -1;
    $('.system-btn, .sidebar-sub-system-btn').removeClass('keyboard-highlight');
}

// Scroll the selected system button into view
function scrollSystemIntoView(sysId: string) {
    // Try main system button first, then sub-system button
    let btn = $(`.system-btn[data-system-id="${sysId}"]`);
    if (!btn.length) {
        btn = $(`.sidebar-sub-system-btn[data-system-id="${sysId}"]`);
    }
    if (btn.length) {
        btn[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}


//

var fingerprintErrorShown = false;

function showFingerprintError(err: any) {
    if (fingerprintErrorShown) return;
    fingerprintErrorShown = true;

    const errorMsg = err?.message || String(err);
    console.error("Canvas access error:", err);

    // Check if it's likely a fingerprinting protection issue
    if (errorMsg.includes('fingerprint') || errorMsg.includes('canvas') || errorMsg.includes('getImageData')) {
        alert(
            "⚠️ Canvas Access Blocked\n\n" +
            "Dithertron cannot access canvas image data. This is usually caused by browser fingerprinting protection.\n\n" +
            "To fix this:\n" +
            "• Firefox: Disable 'Enhanced Tracking Protection' for this site (shield icon in address bar)\n" +
            "• Brave: Disable 'Block fingerprinting' in Shields settings\n" +
            "• Other browsers: Check privacy/security settings\n\n" +
            "Technical details: " + errorMsg
        );
    }
}

function testCanvasAccess(): boolean {
    try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = testCanvas.height = 1;
        const ctx = testCanvas.getContext('2d');
        ctx.fillStyle = 'rgb(255, 0, 0)';
        ctx.fillRect(0, 0, 1, 1);
        ctx.getImageData(0, 0, 1, 1);
        return true;
    } catch (e) {
        showFingerprintError(e);
        return false;
    }
}

function getCanvasImageData(canvas: HTMLCanvasElement) {
    try {
        return new Uint32Array(canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    } catch (e) {
        showFingerprintError(e);
        throw e;
    }
}
function drawRGBA(dest: HTMLCanvasElement, arr: Uint32Array) {
    var ctx = dest.getContext('2d');
    var imageData = ctx.createImageData(dest.width, dest.height);
    var datau32 = new Uint32Array(imageData.data.buffer);
    if (datau32.length == arr.length) {
        datau32.set(arr);
        ctx.putImageData(imageData, 0, 0);
    } else {
        console.log("drawRGBA(): array length mismatch");
        // TODO: source array is too long when switching
    }
}

function updateCanvasDisplaySize() {
    const container = document.querySelector('.rendered-container') as HTMLElement;
    if (!container || !destCanvas) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (containerWidth === 0 || containerHeight === 0) return;

    const containerAR = containerWidth / containerHeight;

    // Get canvas display aspect ratio (includes scaleX for non-square pixels)
    const scaleX = dithertron.settings?.scaleX || 1;
    const canvasAR = (destCanvas.width * scaleX) / destCanvas.height;

    if (canvasAR > containerAR) {
        // Canvas is relatively wider - fit to container width
        destCanvas.style.width = '100%';
        destCanvas.style.height = 'auto';
    } else {
        // Canvas is relatively taller - fit to container height
        destCanvas.style.width = 'auto';
        destCanvas.style.height = '100%';
    }
}
function applyBrightness(imageData: Uint32Array, bright: number, bias: number, sat: number, gamma: number) {
    bright *= 1;
    bias *= 1;
    var u8arr = new Uint8ClampedArray(imageData.buffer);
    for (var i = 0; i < u8arr.length; i += 4) {
        var r = u8arr[i];
        var g = u8arr[i + 1];
        var b = u8arr[i + 2];
        if (sat != 1.0) {
            var gray = 0.2989 * r + 0.5870 * g + 0.1140 * b; //weights from CCIR 601 spec
            r = gray * (1 - sat) + r * sat;
            g = gray * (1 - sat) + g * sat;
            b = gray * (1 - sat) + b * sat;
        }
        u8arr[i] = Math.pow(r * bright, gamma) + bias;
        u8arr[i + 1] = Math.pow(g * bright, gamma) + bias;
        u8arr[i + 2] = Math.pow(b * bright, gamma) + bias;
    }
}

function reprocessImage() {
    var resizeImageData = getCanvasImageData(resizeCanvas);
    let bright = (parseFloat(contrastSlider.value) - 50) / 100 + 1.0; // middle = 1.0, range = 0.5-1.5
    let bias = (parseFloat(brightSlider.value) - bright * 50) * (128 / 50);
    let sat = (parseFloat(saturationSlider.value) - 50) / 50 + 1.0; // middle = 1.0, range = 0-2
    let gamma = 1;
    applyBrightness(resizeImageData, bright, bias, sat, gamma);
    dithertron.setSourceImage(resizeImageData);
    resetImage();
}

function resetImage() {
    // Read dither selection from current index
    dithertron.settings.ditherfn = ALL_DITHER_SETTINGS[currentDitherIndex].kernel;
    // Read error function from active button
    const activeErrorBtn = $('.error-func-btn.active');
    if (activeErrorBtn.length > 0) {
        dithertron.settings.errfn = activeErrorBtn.attr('data-error-func') || 'perceptual';
    }
    dithertron.settings.diffuse = parseFloat(diffuseSlider.value) / 100;
    dithertron.settings.ordered = parseFloat(orderedSlider.value) / 100;
    dithertron.settings.noise = parseFloat(noiseSlider.value);
    dithertron.settings.paletteDiversity = parseFloat(diversitySlider.value) / 200 + 0.75;

    // Use locked/modified palette if available
    if ((paletteLocked || paletteModified) && currentPalette) {
        dithertron.settings.pal = currentPalette;
    }

    dithertron.setSettings(dithertron.settings);
    dithertron.restart();
}

function resetSourceSliders() {
    // Reset source adjustment sliders to defaults using bootstrap-slider API
    ($('#brightSlider') as any).slider('setValue', 50);
    ($('#contrastSlider') as any).slider('setValue', 50);
    ($('#saturationSlider') as any).slider('setValue', 50);
    // Reset error function to first option (Perceptual)
    $('.error-func-btn').removeClass('active').first().addClass('active');
    reprocessImage();
}

function resetDitherSliders() {
    // Reset dither sliders to defaults using bootstrap-slider API
    ($('#diversitySlider') as any).slider('setValue', 60);
    ($('#orderedSlider') as any).slider('setValue', 0);
    ($('#noiseSlider') as any).slider('setValue', 5);
    ($('#diffuseSlider') as any).slider('setValue', 75);
    // Reset dither algorithm to first option (Floyd-Steinberg)
    currentDitherIndex = 0;
    $('#diffMethodLabel').text(ALL_DITHER_SETTINGS[0].name);
    resetImage();
}

function convertImage() {
    let cropCanvas: HTMLCanvasElement | null = null;

    if (cropEnabled && cropper) {
        // Use cropped area
        cropCanvas = cropper.getCroppedCanvas();
    } else {
        // Use full source image - create a canvas from the source image
        if (sourceImage && sourceImage.complete && sourceImage.naturalWidth > 0) {
            cropCanvas = document.createElement('canvas');
            cropCanvas.width = sourceImage.naturalWidth;
            cropCanvas.height = sourceImage.naturalHeight;
            const ctx = cropCanvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(sourceImage, 0, 0);
            }
        }
    }

    // avoid "Failed to execute 'createImageBitmap' on 'Window': The crop rect height is 0."
    if (!cropCanvas?.width || !cropCanvas?.height) return;

    // Calculate expanded dimensions based on source aspect ratio
    const expandedDims = calculateExpandedDimensions(
        dithertron.settings,
        { width: cropCanvas.width, height: cropCanvas.height }
    );
    currentExpandedDimensions = expandedDims;

    // Apply pixel scale — reduce resolution so pixels appear larger
    // The CSS image-rendering: pixelated ensures crisp upscaling
    // Divide by √scale so that "Nx" means each pixel covers N× the area
    const dimScale = Math.sqrt(currentPixelScale);
    const scaledWidth = Math.round(expandedDims.width / dimScale);
    const scaledHeight = Math.round(expandedDims.height / dimScale);

    // Update canvas sizes to match scaled dimensions
    resizeCanvas.width = scaledWidth;
    resizeCanvas.height = scaledHeight;
    destCanvas.width = scaledWidth;
    destCanvas.height = scaledHeight;

    // Update aspect ratio for display
    const pixelAspect = dithertron.settings.scaleX || 1;
    (destCanvas.style as any).aspectRatio = (expandedDims.width * pixelAspect / expandedDims.height).toString();
    updateCanvasDisplaySize();

    // Update system info to show current dimensions
    showSystemInfo(dithertron.settings);

    // Resize source to fill expanded canvas dimensions
    pica().resize(cropCanvas, resizeCanvas, {}).then(() => {
        reprocessImage();
    }).catch((err) => {
        showFingerprintError(err);
    });
}

function getSystemInfo(sys: DithertronSettings) {
    // Show expanded dimensions if available, otherwise native
    let dimStr: string;
    if (currentExpandedDimensions &&
        (currentExpandedDimensions.width !== sys.width || currentExpandedDimensions.height !== sys.height)) {
        dimStr = currentExpandedDimensions.width + " x " + currentExpandedDimensions.height +
                 " (native: " + sys.width + " x " + sys.height + ")";
    } else {
        dimStr = sys.width + " x " + sys.height;
    }

    var s = dimStr;
    if (sys.reduce) s += ", " + sys.reduce + " out of " + sys.pal.length + " colors";
    else if (sys.pal) s += ", " + sys.pal.length + " colors";
    if (sys.block) {
        s += ", ";
        s += sys.block.colors + " colors per ";
        s += sys.block.w + "x" + sys.block.h + " block";
    }
    return s;
}

function showSystemInfo(sys: DithertronSettings) {
    $("#targetFormatInfo").text(getSystemInfo(sys));
}

// Convert 0x00BBGGRR to #RRGGBB hex string for color input
function uint32ToHex(col: number): string {
    const r = col & 0xff;
    const g = (col >> 8) & 0xff;
    const b = (col >> 16) & 0xff;
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Convert #RRGGBB hex string to 0x00BBGGRR format
function hexToUint32(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r & 0xff) | ((g & 0xff) << 8) | ((b & 0xff) << 16);
}

function updatePaletteSwatches(pal: Uint32Array) {
    var swat = $("#paletteSwatches");
    swat.empty();

    if (pal && pal.length < 64) {
        // For systems with palette reduction, capture the optimal palette from worker
        // on first result (before any user modifications) and if palette is not locked
        if (!paletteModified && !optimalPaletteCaptured && !paletteLocked) {
            originalPalette = new Uint32Array(pal);
            currentPalette = new Uint32Array(pal);
            originalPaletteSize = pal.length;
            optimalPaletteCaptured = true;
        }

        // Use locked/modified palette for display if available, otherwise use worker's palette
        const displayPalette = (paletteLocked || paletteModified) && currentPalette ? currentPalette : pal;

        displayPalette.forEach((col, index) => {
            var rgb = "rgb(" + (col & 0xff) + "," + ((col >> 8) & 0xff) + "," + ((col >> 16) & 0xff) + ")";
            var sq = $('<span class="palette-swatch palette-swatch-clickable">&nbsp;</span>')
                .css("background-color", rgb)
                .attr('data-index', index);
            // Add remove button for user-added colors
            if (index >= originalPaletteSize) {
                var removeBtn = $('<span class="palette-swatch-remove" data-index="' + index + '">&times;</span>');
                sq.append(removeBtn).addClass('user-added');
            }
            swat.append(sq);
        });

        // Add "+" button to append a new color
        var addBtn = $('<span class="palette-swatch palette-swatch-add" title="Add color">+</span>');
        swat.append(addBtn);

        // Show/hide buttons based on state
        updateResetButtonVisibility();
        updateLockButtonVisibility();
    }
}

function updateResetButtonVisibility() {
    if (paletteModified) {
        $('#resetPaletteBtn').show();
    } else {
        $('#resetPaletteBtn').hide();
    }
}

function updateLockButtonVisibility() {
    // Show lock button only for systems with palette reduction
    if (dithertron.settings?.reduce && currentPalette) {
        $('#lockPaletteBtn').show();
    } else {
        $('#lockPaletteBtn').hide();
    }
}

function togglePaletteLock() {
    paletteLocked = !paletteLocked;

    const btn = $('#lockPaletteBtn');
    if (paletteLocked) {
        btn.removeClass('btn-outline-secondary').addClass('btn-warning');
        btn.html('<i class="fa fa-lock"></i> Lock');
        btn.attr('title', 'Palette is locked - click to unlock and allow regeneration');
    } else {
        btn.removeClass('btn-warning').addClass('btn-outline-secondary');
        btn.html('<i class="fa fa-unlock"></i> Lock');
        btn.attr('title', 'Lock palette to prevent regeneration when cropping');
    }
}

// Track which swatch index the color picker is currently editing
var colorPickerActiveIndex: number = -1;

function onSwatchClick(e: JQuery.ClickEvent) {
    const index = parseInt($(e.currentTarget).attr('data-index') || '0');
    if (currentPalette == null || index >= currentPalette.length) return;

    // Set the current color and track which swatch is being edited
    const currentColor = uint32ToHex(currentPalette[index]);
    const colorInput = $('#colorPickerInput');
    colorInput.val(currentColor);
    colorPickerActiveIndex = index;

    // Highlight the active swatch
    $('.palette-swatch-clickable').removeClass('picker-active');
    $(e.currentTarget).addClass('picker-active');

    // Trigger the native color picker by clicking the hidden input
    colorInput[0].click();
}

function onColorPickerChange() {
    const index = colorPickerActiveIndex;
    if (index < 0) return;

    const newColor = hexToUint32($('#colorPickerInput').val() as string);

    if (currentPalette == null || index >= currentPalette.length) return;

    // Update the mutable palette
    currentPalette[index] = newColor;
    paletteModified = true;

    // Automatically lock palette when user manually edits a color
    if (!paletteLocked && dithertron.settings?.reduce) {
        paletteLocked = true;
        const btn = $('#lockPaletteBtn');
        btn.removeClass('btn-outline-secondary').addClass('btn-warning');
        btn.html('<i class="fa fa-lock"></i> Lock');
        btn.attr('title', 'Palette is locked - click to unlock and allow regeneration');
    }

    // Update the swatch color immediately
    const rgb = "rgb(" + (newColor & 0xff) + "," + ((newColor >> 8) & 0xff) + "," + ((newColor >> 16) & 0xff) + ")";
    $(`.palette-swatch-clickable[data-index="${index}"]`).css('background-color', rgb);

    // Update the settings palette and re-dither
    dithertron.settings.pal = currentPalette;
    if (isAnimationMode) {
        reprocessAnimation();
    } else {
        resetImage();
    }
}

function closeColorPicker() {
    $('.palette-swatch-clickable').removeClass('picker-active');
    colorPickerActiveIndex = -1;
}


function addPaletteColor() {
    if (currentPalette == null) return;

    // Append a middle-gray color
    const newPalette = new Uint32Array(currentPalette.length + 1);
    newPalette.set(currentPalette);
    newPalette[currentPalette.length] = 0x00808080; // gray in 0x00BBGGRR
    currentPalette = newPalette;
    paletteModified = true;

    // Auto-lock for reduce systems
    if (!paletteLocked && dithertron.settings?.reduce) {
        paletteLocked = true;
        const btn = $('#lockPaletteBtn');
        btn.removeClass('btn-outline-secondary').addClass('btn-warning');
        btn.html('<i class="fa fa-lock"></i> Lock');
    }

    dithertron.settings.pal = currentPalette;
    updatePaletteSwatches(currentPalette);
    if (isAnimationMode) reprocessAnimation();
    else resetImage();
}

function removePaletteColor(index: number) {
    if (currentPalette == null || index < originalPaletteSize || index >= currentPalette.length) return;

    const newPalette = new Uint32Array(currentPalette.length - 1);
    newPalette.set(currentPalette.subarray(0, index));
    if (index < currentPalette.length - 1) {
        newPalette.set(currentPalette.subarray(index + 1), index);
    }
    currentPalette = newPalette;
    paletteModified = currentPalette.length !== originalPaletteSize || !originalPalette ||
        currentPalette.some((v, i) => i < originalPaletteSize && originalPalette && v !== originalPalette[i]);

    dithertron.settings.pal = currentPalette;
    updatePaletteSwatches(currentPalette);
    if (isAnimationMode) reprocessAnimation();
    else resetImage();
}

function resetPalette() {
    if (originalPalette == null) return;

    // Restore original palette (removes user-added colors too)
    currentPalette = new Uint32Array(originalPalette);
    paletteModified = false;
    originalPaletteSize = originalPalette.length;

    // Update settings and re-dither
    dithertron.settings.pal = currentPalette;
    if (isAnimationMode) {
        reprocessAnimation();
    } else {
        resetImage();
    }
}

// Animation functions
function enterAnimationMode(gifData: ParsedAnimatedGif): void {
    isAnimationMode = true;
    animationProcessingAborted = false;

    // Set source frames in animation state manager
    animationState.setSourceFrames(gifData.frames);

    // Update UI to show animation mode
    $('#animationControls').addClass('visible');
    $('#downloadFrameBtn').show();
    $('#downloadBtnText').text('GIF');
    $('#paletteConsistencyOption').addClass('visible');
    $('#sourcePlaybackControls').addClass('visible');

    // Set up frame slider
    const frameCount = animationState.getFrameCount();
    $('#frameSlider').attr('max', frameCount - 1).val(0);
    updateFrameCounter(0);

    // Set up callbacks
    animationState.setCallbacks(
        onFrameProcessed,
        onProcessingProgress,
        onPlaybackFrame
    );
}

function exitAnimationMode(): void {
    isAnimationMode = false;
    animationProcessingAborted = true;
    animationState.reset();

    // Stop source playback if active
    if (sourceGifPlayback.isPlaying) {
        pauseSourcePlayback();
    }

    // Ensure source GIF canvas is hidden
    $('#sourceGifCanvas').removeClass('visible');
    $('.cropper-container').css('visibility', 'visible');

    // Update UI to hide animation mode
    $('#animationControls').removeClass('visible');
    $('#downloadFrameBtn').hide();
    $('#downloadBtnText').text('PNG');
    $('#paletteConsistencyOption').removeClass('visible');
    $('#processingProgress').removeClass('visible');
    $('#processingControl').hide();
    $('#sourcePlaybackControls').removeClass('visible');
}

function updateFrameCounter(frameIndex: number): void {
    const total = animationState.getFrameCount();
    $('#frameCounter').text(`${frameIndex + 1} / ${total}`);
}

function onFrameProcessed(frameIndex: number, frame: ProcessedFrame): void {
    // Update display if this is the currently viewed frame
    if (frameIndex === animationState.getCurrentFrameIndex()) {
        drawRGBA(destCanvas, frame.img);
        updatePaletteSwatches(frame.pal);
    }
}

function formatTime(ms: number): string {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
}

function onProcessingProgress(progress: number, current: number, total: number): void {
    const percent = Math.round(progress * 100);
    const remaining = animationState.getEstimatedTimeRemaining();
    const eta = remaining > 0 ? formatTime(remaining) : 'calculating...';

    $('#progressText').text(`${percent}% - ${current}/${total} - ETA: ${eta}`);
    $('#progressBar').css('width', `${percent}%`);

    if (progress < 1) {
        $('#processingProgress').addClass('visible');
    } else {
        $('#processingProgress').removeClass('visible');
    }
}

function onPlaybackFrame(frameIndex: number): void {
    // Update frame slider
    $('#frameSlider').val(frameIndex);
    updateFrameCounter(frameIndex);

    // Display the frame
    const frame = animationState.getProcessedFrame(frameIndex);
    if (frame) {
        drawRGBA(destCanvas, frame.img);
        updatePaletteSwatches(frame.pal);
    }
}

function togglePlayback(): void {
    const isPlaying = animationState.togglePlayback();
    updatePlayPauseButton(isPlaying);
}

function updatePlayPauseButton(isPlaying: boolean): void {
    const icon = isPlaying ? 'fa-pause' : 'fa-play';
    $('#playPauseBtn i').removeClass('fa-play fa-pause').addClass(icon);
}

function seekToFrame(frameIndex: number): void {
    // Pause playback when seeking manually
    if (animationState.isPlaying()) {
        animationState.pause();
        updatePlayPauseButton(false);
    }

    animationState.seekToFrame(frameIndex);
    updateFrameCounter(frameIndex);

    const frame = animationState.getProcessedFrame(frameIndex);
    if (frame) {
        drawRGBA(destCanvas, frame.img);
        updatePaletteSwatches(frame.pal);
    }
}

async function processAnimationFrames(startIndex: number = 0): Promise<void> {
    if (!isAnimationMode) return;

    animationProcessingAborted = false;

    // Only call startProcessing if we're starting from the beginning
    if (startIndex === 0) {
        animationState.startProcessing();
    }

    $('#processingProgress').addClass('visible');
    $('#processAllFramesBtn').hide();
    $('#cancelProcessingBtn').show();

    const frameCount = animationState.getFrameCount();
    let lockedPalette: Uint32Array | null = null;

    // If we already have processed frames and consistent palette is on, lock the first frame's palette
    if (startIndex > 0 && consistentPalette) {
        const firstFrame = animationState.getProcessedFrame(0);
        if (firstFrame && firstFrame.pal) {
            lockedPalette = new Uint32Array(firstFrame.pal);
        }
    }

    for (let i = startIndex; i < frameCount; i++) {
        if (animationProcessingAborted) {
            break;
        }

        const sourceFrame = animationState.getSourceFrame(i);
        if (!sourceFrame) continue;

        // Update remaining count
        $('#remainingFrameCount').text(frameCount - i);

        // Process this frame
        const { frame: processedFrame, timeMs } = await processFrame(sourceFrame, i, lockedPalette);

        if (animationProcessingAborted) {
            break;
        }

        animationState.addProcessedFrame(processedFrame, timeMs);

        // Lock palette after first frame if consistent palette is enabled
        if (i === 0 && consistentPalette && processedFrame.pal) {
            lockedPalette = new Uint32Array(processedFrame.pal);
        }
    }

    $('#cancelProcessingBtn').hide();

    if (!animationProcessingAborted) {
        animationState.finishProcessing();
        // Update slider max to processed frames
        $('#frameSlider').attr('max', animationState.getProcessedFrameCount() - 1);
    }
}

function processFrame(
    sourceFrame: GifFrameData,
    frameIndex: number,
    lockedPalette: Uint32Array | null
): Promise<{frame: ProcessedFrame, timeMs: number}> {
    return new Promise((resolve) => {
        const startTime = performance.now();
        // Create a temporary canvas for this frame
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceFrame.width;
        tempCanvas.height = sourceFrame.height;
        const ctx = tempCanvas.getContext('2d')!;

        // Draw source frame pixels to temp canvas
        const imageData = ctx.createImageData(sourceFrame.width, sourceFrame.height);
        const data = new Uint32Array(imageData.data.buffer);
        data.set(sourceFrame.pixels);
        ctx.putImageData(imageData, 0, 0);

        // Calculate expanded dimensions for this frame
        const expandedDims = calculateExpandedDimensions(
            dithertron.settings,
            { width: sourceFrame.width, height: sourceFrame.height }
        );

        // Create resize canvas
        const frameResizeCanvas = document.createElement('canvas');
        frameResizeCanvas.width = expandedDims.width;
        frameResizeCanvas.height = expandedDims.height;

        // Resize the frame
        pica().resize(tempCanvas, frameResizeCanvas, {}).then(() => {
            // Apply brightness/contrast/saturation adjustments
            const resizedData = new Uint32Array(
                frameResizeCanvas.getContext('2d')!
                    .getImageData(0, 0, frameResizeCanvas.width, frameResizeCanvas.height).data.buffer
            );

            let bright = (parseFloat(contrastSlider.value) - 50) / 100 + 1.0;
            let bias = (parseFloat(brightSlider.value) - bright * 50) * (128 / 50);
            let sat = (parseFloat(saturationSlider.value) - 50) / 50 + 1.0;
            applyBrightness(resizedData, bright, bias, sat, 1);

            // Create a worker for this frame
            const frameWorker = new Worker("./gen/worker.js");

            frameWorker.onmessage = (ev) => {
                const msg = ev.data as PixelsAvailableMessage;
                if (msg && msg.final) {
                    frameWorker.terminate();

                    const endTime = performance.now();
                    resolve({
                        frame: {
                            img: msg.img,
                            indexed: msg.indexed,
                            pal: msg.pal,
                            delay: sourceFrame.delay
                        },
                        timeMs: endTime - startTime
                    });
                }
            };

            // Configure worker settings
            const frameSettings = { ...dithertron.settings };
            frameSettings.ditherfn = dithertron.settings.ditherfn;
            frameSettings.errfn = dithertron.settings.errfn;
            frameSettings.diffuse = parseFloat(diffuseSlider.value) / 100;
            frameSettings.ordered = parseFloat(orderedSlider.value) / 100;
            frameSettings.noise = parseFloat(noiseSlider.value);
            frameSettings.paletteDiversity = parseFloat(diversitySlider.value) / 200 + 0.75;

            // Use locked palette if available
            if (lockedPalette) {
                frameSettings.pal = lockedPalette;
            }

            // Override dimensions for this frame
            frameSettings.width = expandedDims.width;
            frameSettings.height = expandedDims.height;

            frameWorker.postMessage({ cmd: "setSettings", data: frameSettings });
            frameWorker.postMessage({ cmd: "setSourceImage", data: resizedData });
            frameWorker.postMessage({ cmd: "restart" });
        });
    });
}

// Process just the first frame for preview purposes (doesn't affect animation state)
async function processFirstFramePreview(): Promise<void> {
    if (!isAnimationMode) return;

    const sourceFrame = animationState.getSourceFrame(0);
    if (!sourceFrame) return;

    const { frame: processedFrame } = await processFrame(sourceFrame, 0, null);

    // Show the processed frame immediately in the rendered area
    drawRGBA(destCanvas, processedFrame.img);
    updatePaletteSwatches(processedFrame.pal);
}

// --- Batch Processing ---

function cancelBatch() {
    batchAborted = true;
}

async function processBatchImages(files: FileList) {
    if (isAnimationMode) {
        exitAnimationMode();
    }

    isBatchMode = true;
    batchAborted = false;

    const batchProgressEl = document.getElementById('batchProgress')!;
    const batchProgressText = document.getElementById('batchProgressText')!;
    const batchProgressBar = document.getElementById('batchProgressBar')!;
    const cancelBtn = document.getElementById('cancelBatchBtn')!;
    const zipBtn = document.getElementById('downloadBatchZipBtn') as HTMLButtonElement;

    batchProgressEl.classList.add('visible');
    cancelBtn.style.display = '';
    zipBtn.disabled = true;
    cancelBtn.onclick = cancelBatch;

    const zip = new JSZip();

    // Filter to image files (accept by type or common image extensions)
    const imageExts = /\.(png|jpe?g|gif|bmp|webp|tiff?|svg|ico)$/i;
    const imageFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/') || imageExts.test(files[i].name)) {
            imageFiles.push(files[i]);
        }
    }
    console.log(`Batch: ${imageFiles.length} image files out of ${files.length} selected`);

    let processedCount = 0;

    for (let i = 0; i < imageFiles.length; i++) {
        if (batchAborted) break;

        const file = imageFiles[i];
        const progress = Math.round(((i) / imageFiles.length) * 100);
        batchProgressText.textContent = `Processing ${i + 1} of ${imageFiles.length}...`;
        batchProgressBar.style.width = progress + '%';

        try {
            console.log(`Batch: starting ${file.name} (${file.type}, ${file.size} bytes)`);
            const result = await processSingleBatchImage(file);
            console.log(`Batch: finished ${file.name}`, result ? 'OK' : 'null');
            if (result) {
                zip.file(result.name, result.blob);
                processedCount++;
            }
        } catch (e) {
            console.error(`Batch: failed to process ${file.name}`, e);
        }
    }

    // Done — hide progress, show zip button
    batchProgressBar.style.width = '100%';
    batchProgressText.textContent = batchAborted ? 'Batch cancelled' : `Batch complete — ${processedCount} files`;
    cancelBtn.style.display = 'none';

    if (processedCount > 0) {
        zipBtn.disabled = false;
        zipBtn.onclick = async () => {
            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, `batch-${dithertron.settings.id}.zip`);
        };
    }

    setTimeout(() => {
        batchProgressEl.classList.remove('visible');
    }, 2000);

    isBatchMode = false;
}

async function processSingleBatchImage(file: File): Promise<{ name: string; blob: Blob } | null> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = async () => {
            URL.revokeObjectURL(url);
            try {
                // Draw image to a temp canvas
                const srcCanvas = document.createElement('canvas');
                srcCanvas.width = img.naturalWidth;
                srcCanvas.height = img.naturalHeight;
                const srcCtx = srcCanvas.getContext('2d')!;
                srcCtx.drawImage(img, 0, 0);

                // Build a GifFrameData-compatible object for processFrame
                const srcData = new Uint32Array(
                    srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height).data.buffer
                );
                const frameData: GifFrameData = {
                    pixels: srcData,
                    delay: 0,
                    width: srcCanvas.width,
                    height: srcCanvas.height,
                };

                const { frame } = await processFrame(frameData, 0, null);

                // Render result to temp canvas and export as PNG
                // Use expanded dimensions since processFrame resizes to those
                const expandedDims = calculateExpandedDimensions(
                    dithertron.settings,
                    { width: srcCanvas.width, height: srcCanvas.height }
                );
                const outCanvas = document.createElement('canvas');
                outCanvas.width = expandedDims.width;
                outCanvas.height = expandedDims.height;
                const outCtx = outCanvas.getContext('2d')!;
                const outImageData = outCtx.createImageData(expandedDims.width, expandedDims.height);
                new Uint32Array(outImageData.data.buffer).set(frame.img);
                outCtx.putImageData(outImageData, 0, 0);

                // Also show the last processed result in the main view
                drawRGBA(destCanvas, frame.img);
                updatePaletteSwatches(frame.pal);

                outCanvas.toBlob((blob) => {
                    if (blob) {
                        const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
                        const fileName = `${baseName}-${dithertron.settings.id}.png`;
                        resolve({ name: fileName, blob });
                    } else {
                        resolve(null);
                    }
                }, 'image/png');
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(`Failed to load ${file.name}`));
        };
        img.src = url;
    });
}

async function loadAnimatedGif(file: File): Promise<void> {
    try {
        const gifData = await loadGifFromFile(file);

        if (!gifData.isAnimated) {
            // Single frame GIF - treat as regular image
            exitAnimationMode();
            const url = URL.createObjectURL(file);
            loadSourceImage(url);
            return;
        }

        // Enter animation mode
        enterAnimationMode(gifData);

        // Set first frame as source for initial display
        const firstFrame = gifData.frames[0];
        if (firstFrame) {
            // Create a blob URL from the first frame for cropper
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = firstFrame.width;
            tempCanvas.height = firstFrame.height;
            const ctx = tempCanvas.getContext('2d')!;

            const imageData = ctx.createImageData(firstFrame.width, firstFrame.height);
            const data = new Uint32Array(imageData.data.buffer);
            data.set(firstFrame.pixels);
            ctx.putImageData(imageData, 0, 0);

            // Use the first frame as source image (for crop preview)
            tempCanvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    loadSourceImage(url);

                    // Show "Process All Frames" button
                    const totalFrameCount = animationState.getFrameCount();
                    $('#remainingFrameCount').text(totalFrameCount.toString());
                    $('#processingControl').show();

                    // Process first frame for preview (so user can see effect of settings)
                    setTimeout(() => {
                        processFirstFramePreview();
                    }, 500);
                }
            }, 'image/png');
        }
    } catch (err) {
        console.error("Failed to load animated GIF:", err);
        // Fall back to regular image loading
        exitAnimationMode();
        const url = URL.createObjectURL(file);
        loadSourceImage(url);
    }
}

function toggleSourcePlayback(): void {
    if (sourceGifPlayback.isPlaying) {
        pauseSourcePlayback();
    } else {
        playSourcePlayback();
    }
}

function playSourcePlayback(): void {
    if (!isAnimationMode) return;
    sourceGifPlayback.isPlaying = true;
    sourceGifPlayback.currentFrame = 0;
    $('#sourcePlayPauseBtn i').removeClass('fa-play').addClass('fa-pause');

    // Hide cropper container content, show canvas overlay
    $('.cropper-container').css('visibility', 'hidden');
    $('#sourceGifCanvas').addClass('visible');

    scheduleNextSourceFrame();
}

function pauseSourcePlayback(): void {
    sourceGifPlayback.isPlaying = false;
    $('#sourcePlayPauseBtn i').removeClass('fa-pause').addClass('fa-play');

    if (sourceGifPlayback.timer) {
        clearTimeout(sourceGifPlayback.timer);
        sourceGifPlayback.timer = null;
    }

    // Show cropper again, hide canvas
    $('#sourceGifCanvas').removeClass('visible');
    $('.cropper-container').css('visibility', 'visible');
}

function scheduleNextSourceFrame(): void {
    if (!sourceGifPlayback.isPlaying) return;

    const sourceFrame = animationState.getSourceFrame(sourceGifPlayback.currentFrame);
    if (!sourceFrame) return;

    // Draw frame to canvas
    const canvas = document.getElementById('sourceGifCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    canvas.width = sourceFrame.width;
    canvas.height = sourceFrame.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(sourceFrame.width, sourceFrame.height);
    const data = new Uint32Array(imageData.data.buffer);
    data.set(sourceFrame.pixels);
    ctx.putImageData(imageData, 0, 0);

    // Update counter
    $('#sourceFrameCounter').text(`${sourceGifPlayback.currentFrame + 1} / ${animationState.getFrameCount()}`);

    // Advance to next frame
    sourceGifPlayback.currentFrame = (sourceGifPlayback.currentFrame + 1) % animationState.getFrameCount();

    // Schedule next frame
    sourceGifPlayback.timer = window.setTimeout(() => scheduleNextSourceFrame(), sourceFrame.delay);
}

function reprocessAnimation(): void {
    if (!isAnimationMode) return;

    // Abort current processing
    animationProcessingAborted = true;

    // Clear processed frames
    animationState.clearProcessedFrames();
    animationState.pause();
    updatePlayPauseButton(false);

    // Hide processing progress
    $('#processingProgress').removeClass('visible');
    $('#cancelProcessingBtn').hide();

    // Show "Process All Frames" button again
    const totalFrameCount = animationState.getFrameCount();
    $('#remainingFrameCount').text(totalFrameCount.toString());
    $('#processingControl').show();
    $('#processAllFramesBtn').show();

    // Re-process first frame for preview (so user can see effect of new settings)
    setTimeout(() => {
        processFirstFramePreview();
    }, 100);
}

function initializePaletteFromSystem(sys: DithertronSettings) {
    // Unlock palette when switching systems
    if (paletteLocked) {
        paletteLocked = false;
        const btn = $('#lockPaletteBtn');
        btn.removeClass('btn-warning').addClass('btn-outline-secondary');
        btn.html('<i class="fa fa-unlock"></i> Lock');
        btn.attr('title', 'Lock palette to prevent regeneration when cropping');
    }

    // For systems with reduce, we'll capture the optimal palette from the worker
    // For other systems, use the system palette directly
    if (sys.reduce) {
        // Will be captured from worker result in updatePaletteSwatches
        originalPalette = null;
        currentPalette = null;
        originalPaletteSize = 0;
    } else {
        originalPalette = new Uint32Array(sys.pal);
        currentPalette = new Uint32Array(sys.pal);
        originalPaletteSize = sys.pal.length;
    }
    paletteModified = false;
    optimalPaletteCaptured = false;
}

function isExactMatch(imageData: Cropper.ImageData) {
    const settings = dithertron.settings;
    return imageData?.naturalWidth == settings.width
        && imageData?.naturalHeight == settings.height;
}

function processImageDirectly() {
    console.log("Width and height exact match!");
    cropper.clear();
    cropper.disable();
    // copy the image to resizeCanvas
    const ctx = resizeCanvas.getContext('2d');
    ctx.drawImage(sourceImage, 0, 0);
    reprocessImage();
}

function loadSourceImage(url: string) {
    // https://github.com/fengyuanchen/cropperjs/blob/master/README.md
    if (cropper) cropper.destroy();

    const cropperOptions: Cropper.Options = {
        viewMode: 1,
        autoCropArea: 1.0,
        // No forced aspect ratio - canvas expands to match source aspect ratio
        ready() {
            // Start with crop disabled by default
            if (!cropEnabled) {
                cropper.clear();
                cropper.disable();
            }
            // Trigger initial conversion
            convertImage();
        },
        crop(event) {
            // Only respond to crop events when crop is enabled
            if (cropEnabled) {
                if (isExactMatch(cropper.getImageData())) {
                    processImageDirectly();
                } else {
                    convertImage();
                }
            }
        },
    };

    cropper = new Cropper(sourceImage, cropperOptions);
    cropper.replace(url);
    updateURL();
}

function setPixelScale(scale: number) {
    currentPixelScale = scale;
    $('.pixel-scale-btn').removeClass('active');
    $(`.pixel-scale-btn[data-scale="${scale}"]`).addClass('active');
    convertImage();
}

function setTargetSystem(sys: DithertronSettings) {
    var showNoise = sys.conv != 'DitheringCanvas';
    // Reset pixel scale when switching systems
    currentPixelScale = 1;
    $('.pixel-scale-btn').removeClass('active');
    $('.pixel-scale-btn[data-scale="1"]').addClass('active');
    // Initialize mutable palette before setting up worker
    initializePaletteFromSystem(sys);
    // Reset expanded dimensions - will be recalculated in convertImage
    currentExpandedDimensions = null;
    dithertron.newWorker();
    dithertron.setSettings(sys);
    dithertron.restart();
    showSystemInfo(sys);
    // Set initial dimensions to native - convertImage will expand as needed
    resizeCanvas.width = destCanvas.width = sys.width;
    resizeCanvas.height = destCanvas.height = sys.height;
    let pixelAspect = sys.scaleX || 1;
    (destCanvas.style as any).aspectRatio = (sys.width * pixelAspect / sys.height).toString();
    updateCanvasDisplaySize();
    $("#noiseSection").css('display', showNoise ? 'flex' : 'none');
    $("#diversitySection").css('display', sys.reduce ? 'flex' : 'none');

    // Reprocess animation if in animation mode
    if (isAnimationMode) {
        reprocessAnimation();
    } else if (cropper) {
        loadSourceImage((cropper as any).url);
    }
    updateURL();
    updateCurrentSystemDisplay(sys);
}

function getFilenamePrefix() {
    var fn = filenameLoaded || "image";
    try { fn = fn.split('.').shift() || "image"; } catch (e) { } // remove extension
    return fn + "-" + dithertron.settings.id;
}

function getNativeFormatData() {
    var img = dithertron.lastPixels;
    let funcname = dithertron.settings.toNative;
    if (!funcname) return null;
    var fn = exportfuncs[funcname];
    return img && fn && fn(img, dithertron.settings);
}

function downloadNativeFormat() {
    var data = getNativeFormatData();
    if (data != null) {
        var blob = new Blob([data], { type: "application/octet-stream" });
        saveAs(blob, getFilenamePrefix() + ".bin");
    }
}

// Create a canvas at the rendered display size (matching the on-screen aspect ratio exactly)
function createRenderedCanvas(): HTMLCanvasElement {
    // Use the CSS aspect-ratio value to determine export dimensions, ensuring
    // the exported image matches exactly what's displayed on screen.
    const displayedAR = parseFloat((destCanvas.style as any).aspectRatio) ||
        (destCanvas.width / destCanvas.height);

    // Use native buffer height as the base, compute width from displayed AR
    const renderedHeight = destCanvas.height;
    const renderedWidth = Math.round(renderedHeight * displayedAR);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = renderedWidth;
    tempCanvas.height = renderedHeight;

    const ctx = tempCanvas.getContext('2d');
    if (ctx) {
        // Disable image smoothing for crisp pixel art scaling
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(destCanvas, 0, 0, renderedWidth, renderedHeight);
    }

    return tempCanvas;
}

function downloadCurrentFrame(): void {
    if (!isAnimationMode) return;

    const frameIndex = animationState.getCurrentFrameIndex();
    const currentFrame = animationState.getCurrentProcessedFrame();

    // Use processed frame if available, otherwise use current canvas content (preview)
    let sourceCanvas: HTMLCanvasElement;

    if (currentFrame) {
        // Create a temporary canvas with the processed frame data
        sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = destCanvas.width;
        sourceCanvas.height = destCanvas.height;

        const ctx = sourceCanvas.getContext('2d');
        if (ctx) {
            const imageData = ctx.createImageData(sourceCanvas.width, sourceCanvas.height);
            const data = new Uint32Array(imageData.data.buffer);
            data.set(currentFrame.img);
            ctx.putImageData(imageData, 0, 0);
        }
    } else {
        // Use current destCanvas content (preview frame)
        sourceCanvas = destCanvas;
    }

    // Apply scaleX for aspect ratio
    const scaleX = dithertron.settings?.scaleX || 1;
    const renderedWidth = Math.round(sourceCanvas.width * scaleX);
    const renderedHeight = sourceCanvas.height;

    const renderedCanvas = document.createElement('canvas');
    renderedCanvas.width = renderedWidth;
    renderedCanvas.height = renderedHeight;

    const renderedCtx = renderedCanvas.getContext('2d');
    if (renderedCtx) {
        renderedCtx.imageSmoothingEnabled = false;
        renderedCtx.drawImage(sourceCanvas, 0, 0, renderedWidth, renderedHeight);
    }

    // Export as PNG - use "preview" in filename if no processed frames
    const frameSuffix = currentFrame ? `frame${frameIndex}` : 'preview';
    const filename = `${getFilenamePrefix()}-${frameSuffix}.png`;
    renderedCanvas.toBlob((blob) => {
        if (blob) {
            saveAs(blob, filename);
        }
    }, "image/png");
}

async function downloadImageFormat() {
    if (isAnimationMode && animationState.getProcessedFrameCount() > 1) {
        // Export as animated GIF
        try {
            const frames = animationState.getAllProcessedFrames();
            const width = destCanvas.width;
            const height = destCanvas.height;
            const scaleX = dithertron.settings?.scaleX || 1;

            const blob = await exportAnimatedGif(frames, width, height, { scaleX });
            saveAs(blob, getFilenamePrefix() + ".gif");
        } catch (err) {
            console.error("Failed to export animated GIF:", err);
            alert("Failed to export animated GIF. Please try again.");
        }
    } else {
        // Export as PNG
        const renderedCanvas = createRenderedCanvas();
        renderedCanvas.toBlob((blob) => {
            saveAs(blob, getFilenamePrefix() + ".png");
        }, "image/png");
    }
}
async function copyImageToClipboard() {
    try {
        const renderedCanvas = createRenderedCanvas();
        const blob = await new Promise<Blob>((resolve, reject) => {
            renderedCanvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error("Failed to create blob"));
            }, "image/png");
        });
        await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
        ]);
        // Brief visual feedback
        const btn = $('#copyImageBtn');
        const originalText = btn.html();
        btn.html('<i class="fa fa-check"></i> Copied!');
        setTimeout(() => btn.html(originalText), 1500);
    } catch (err) {
        console.error("Failed to copy image:", err);
        alert("Failed to copy image to clipboard. Your browser may not support this feature.");
    }
}
function byteArrayToString(data: number[] | Uint8Array): string {
    var str = "";
    if (data != null) {
        var charLUT = new Array();
        for (var i = 0; i < 256; ++i)
            charLUT[i] = String.fromCharCode(i);
        var len = data.length;
        for (var i = 0; i < len; i++)
            str += charLUT[data[i]];
    }
    return str;
}
function getCodeConvertFunction(): () => string {
    var convertFuncName = 'getFileViewerCode_' + dithertron.settings.id.replace(/[^a-z0-9]/g, '_');
    var convertFunc = fileviewers[convertFuncName];
    return convertFunc;
}

async function gotoIDE() {
    function addHiddenField(form: any, name: any, val: any) {
        $('<input type="hidden"/>').attr('name', name).val(val).appendTo(form);
    }
    if (confirm("Open code sample with image in 8bitworkshop?")) {
        //e.target.disabled = true;
        var platform_id = dithertron.settings.id.split('.')[0];
        var form = $((document.forms as any)['ideForm'] as HTMLFormElement);
        form.empty();
        if (platform_id == 'atari8') platform_id = 'atari8-800'; // TODO
        if (platform_id == 'cpc') platform_id = 'cpc.6128'; // TODO
        addHiddenField(form, "platform", platform_id);
        // TODO
        var codeFilename = "viewer-" + getFilenamePrefix() + ".asm";
        var dataFilename = getFilenamePrefix() + ".bin";
        addHiddenField(form, "file0_name", codeFilename);
        var code = getCodeConvertFunction()();
        code = code.replace("$DATAFILE", getFilenamePrefix() + ".bin");
        addHiddenField(form, "file0_data", code);
        addHiddenField(form, "file0_type", "utf8");
        addHiddenField(form, "file1_name", dataFilename);
        addHiddenField(form, "file1_data", btoa(byteArrayToString(getNativeFormatData())));
        addHiddenField(form, "file1_type", "binary");
        form.submit();
    }
}


function exportSettings() {
    const settings: any = {
        version: 1,
        system: dithertron.settings.id,
        brightness: parseInt(brightSlider.value),
        contrast: parseInt(contrastSlider.value),
        saturation: parseInt(saturationSlider.value),
        errorFunc: $('.error-func-btn.active').attr('data-error-func') || 'perceptual',
        diversity: parseInt(diversitySlider.value),
        ordered: parseInt(orderedSlider.value),
        noise: parseInt(noiseSlider.value),
        diffusion: parseInt(diffuseSlider.value),
        ditherMethod: currentDitherIndex,
        pixelScale: currentPixelScale,
    };
    if (paletteModified && currentPalette) {
        settings.palette = Array.from(currentPalette).map(uint32ToHex);
        settings.paletteModified = true;
    }
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    saveAs(blob, getFilenamePrefix() + '-settings.json');
}

function importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result as string);
                if (data.version !== 1) {
                    alert('Unsupported settings version.');
                    return;
                }
                // Restore system
                if (data.system && SYSTEM_LOOKUP[data.system]) {
                    setTargetSystem(SYSTEM_LOOKUP[data.system]);
                }
                // Restore sliders
                if (data.brightness != null) ($('#brightSlider') as any).slider('setValue', data.brightness);
                if (data.contrast != null) ($('#contrastSlider') as any).slider('setValue', data.contrast);
                if (data.saturation != null) ($('#saturationSlider') as any).slider('setValue', data.saturation);
                if (data.diversity != null) ($('#diversitySlider') as any).slider('setValue', data.diversity);
                if (data.ordered != null) ($('#orderedSlider') as any).slider('setValue', data.ordered);
                if (data.noise != null) ($('#noiseSlider') as any).slider('setValue', data.noise);
                if (data.diffusion != null) ($('#diffuseSlider') as any).slider('setValue', data.diffusion);
                // Restore error function
                if (data.errorFunc) {
                    $('.error-func-btn').removeClass('active');
                    $(`.error-func-btn[data-error-func="${data.errorFunc}"]`).addClass('active');
                }
                // Restore dither method
                if (data.ditherMethod != null && data.ditherMethod < ALL_DITHER_SETTINGS.length) {
                    currentDitherIndex = data.ditherMethod;
                    $('#diffMethodLabel').text(ALL_DITHER_SETTINGS[currentDitherIndex].name);
                }
                // Restore pixel scale
                if (data.pixelScale != null) {
                    setPixelScale(data.pixelScale);
                }
                // Restore palette
                if (data.paletteModified && data.palette && Array.isArray(data.palette)) {
                    currentPalette = new Uint32Array(data.palette.map(hexToUint32));
                    paletteModified = true;
                }
                reprocessImage();
            } catch (e) {
                alert('Failed to load settings: ' + (e as Error).message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function updateURL() {
    let qs = {
        sys: dithertron.settings.id,
        image: presetLoaded,
    };
    window.location.hash = '#' + $.param(qs);
}

function decodeQueryString(qs: string) {
    if (qs.startsWith('?')) qs = qs.substr(1);
    var a = qs.split('&');
    if (!a || a.length == 0)
        return {};
    var b: { [name: string]: string } = {};
    for (var i = 0; i < a.length; ++i) {
        var p = a[i].split('=', 2);
        if (p.length == 1)
            b[p[0]] = "";
        else
            b[p[0]] = decodeURIComponent(p[1].replace(/\+/g, " "));
    }
    return b;
}

export function startUI() {

    window.addEventListener('load', function () {
        // Test canvas access early to warn users about fingerprinting protection
        testCanvasAccess();

        // Set up ResizeObserver to handle container size changes
        const renderedContainer = document.querySelector('.rendered-container');
        if (renderedContainer) {
            const resizeObserver = new ResizeObserver(() => {
                updateCanvasDisplaySize();
            });
            resizeObserver.observe(renderedContainer);
        }

        document.querySelector('input[type="file"]').addEventListener('change', function (event) {
            var inputElement = event.target as HTMLInputElement;
            var files = inputElement.files;
            if (!files || files.length === 0) return;

            // Multiple non-GIF files → batch mode
            if (files.length > 1) {
                processBatchImages(files);
                return;
            }

            var file = files[0];
            filenameLoaded = file.name;
            presetLoaded = "";

            // Check if it's a GIF file
            if (isGifFile(file)) {
                loadAnimatedGif(file);
            } else {
                // Exit animation mode if we were in it
                if (isAnimationMode) {
                    exitAnimationMode();
                }
                var url = URL.createObjectURL(file);
                loadSourceImage(url);
            }
        });

        // Example image navigation
        function loadExampleByIndex(index: number) {
            if (index < 0) index = EXAMPLE_IMAGES.length - 1;
            if (index >= EXAMPLE_IMAGES.length) index = 0;
            currentExampleIndex = index;
            const filename = EXAMPLE_IMAGES[index];
            filenameLoaded = presetLoaded = filename;
            if (isAnimationMode) {
                exitAnimationMode();
            }
            loadSourceImage("images/" + filename);
            imageUpload.value = "";
        }

        $('#prevExampleBtn').on('click', () => {
            loadExampleByIndex(currentExampleIndex - 1);
        });

        $('#nextExampleBtn').on('click', () => {
            loadExampleByIndex(currentExampleIndex + 1);
        });

        // Populate button groups
        populateErrorFuncButtons();
        populateSidebarDefaults();
        populateSidebarExtended();
        setupSidebarEvents();
        buildSystemIdList();

        dithertron.pixelsAvailable = (msg) => {
            // TODO: resize canvas?
            drawRGBA(destCanvas, msg.img);
            updatePaletteSwatches(msg.pal);
            /*
            if (msg.final) {
                dest.toBlob((blob) => {
                    $("#pngBytes").text(blob.size+"");
                }, 'image/png');
            }
            */
        }

        const qs = decodeQueryString(window.location.hash.substring(1));
        const currentSystemId = qs['sys'] || SYSTEMS[0].id;
        const currentSystem = SYSTEM_LOOKUP[currentSystemId];
        setTargetSystem(currentSystem);

        filenameLoaded = presetLoaded = qs['image'] || "seurat.jpg";
        currentExampleIndex = EXAMPLE_IMAGES.indexOf(filenameLoaded);
        if (currentExampleIndex < 0) currentExampleIndex = 0;
        loadSourceImage("images/" + filenameLoaded);

        $("#diffuseSlider").on('change', () => {
            if (isAnimationMode) reprocessAnimation();
            else resetImage();
        });
        $("#orderedSlider").on('change', () => {
            if (isAnimationMode) reprocessAnimation();
            else resetImage();
        });
        $("#noiseSlider").on('change', () => {
            if (isAnimationMode) reprocessAnimation();
            else resetImage();
        });
        $("#diversitySlider").on('change', () => {
            if (isAnimationMode) reprocessAnimation();
            else reprocessImage();
        });
        $("#brightSlider").on('change', () => {
            if (isAnimationMode) reprocessAnimation();
            else reprocessImage();
        });
        $("#contrastSlider").on('change', () => {
            if (isAnimationMode) reprocessAnimation();
            else reprocessImage();
        });
        $("#saturationSlider").on('change', () => {
            if (isAnimationMode) reprocessAnimation();
            else reprocessImage();
        });
        $("#resetSourceSliders").on('click', () => {
            resetSourceSliders();
            if (isAnimationMode) reprocessAnimation();
        });
        $("#resetDitherSliders").on('click', () => {
            resetDitherSliders();
            if (isAnimationMode) reprocessAnimation();
        });

        // Error function buttons
        $('#errorFuncGroup').on('click', '.error-func-btn', function() {
            $('.error-func-btn').removeClass('active');
            $(this).addClass('active');
            if (isAnimationMode) reprocessAnimation();
            else resetImage();
        });

        // Dither method navigation
        $('#prevDitherBtn').on('click', () => {
            selectDitherByIndex(currentDitherIndex - 1);
        });

        $('#nextDitherBtn').on('click', () => {
            selectDitherByIndex(currentDitherIndex + 1);
        });

        // System sidebar toggle
        $('#systemSelectorToggle').on('click', () => toggleSystemSidebar(true));
        $('#systemSidebarBackdrop, #systemSidebarClose').on('click', () => toggleSystemSidebar(false));

        // Sidebar collapse/expand for desktop
        $('#sidebarCollapseToggle').on('click', () => collapseSidebar());
        $('#sidebarExpandBtn').on('click', () => expandSidebar());
        initSidebarCollapseState();

        // System search
        $('#systemSearch').on('input', function() {
            filterSidebarSystems($(this).val() as string);
        });

        // Pixel scale buttons
        $('.pixel-scale-btn').on('click', function() {
            const scale = parseFloat($(this).attr('data-scale') || '1');
            setPixelScale(scale);
        });

        // Crop toggle
        $('#cropToggle').on('click', toggleCropMode);

        // Create color picker panel (no Apply button - changes apply automatically)
        const colorPickerHtml = `
            <input type="color" id="colorPickerInput" class="color-picker-hidden">
        `;
        $('#paletteSwatches').after(colorPickerHtml);

        // Add palette control buttons to the left of swatches
        $('#paletteControls').html(`
            <button id="lockPaletteBtn" class="btn btn-sm btn-outline-secondary" style="display:none;" title="Lock palette to prevent regeneration when cropping">
                <i class="fa fa-unlock"></i> Lock
            </button>
            <button id="resetPaletteBtn" class="btn btn-sm btn-outline-warning" style="display:none;">
                Reset
            </button>
        `);

        // Palette swatch click handler - opens native color picker directly
        $('#paletteSwatches').on('click', '.palette-swatch-clickable', onSwatchClick);

        // Add color button
        $('#paletteSwatches').on('click', '.palette-swatch-add', addPaletteColor);

        // Remove color button (on user-added swatches)
        $('#paletteSwatches').on('click', '.palette-swatch-remove', function(e) {
            e.stopPropagation();
            const index = parseInt($(this).attr('data-index') || '-1');
            removePaletteColor(index);
        });

        // Color picker auto-apply on change
        $('#colorPickerInput').on('input', onColorPickerChange);

        // Clear active state when color picker closes
        $('#colorPickerInput').on('change', closeColorPicker);

        // Lock palette button handler
        $('#lockPaletteBtn').on('click', togglePaletteLock);

        // Reset palette button handler
        $('#resetPaletteBtn').on('click', resetPalette);

        // Keyboard navigation for system selection
        $(document).on('keydown', (e) => {
            // Only handle if not focused on an input
            if ($(e.target).is('input, textarea')) return;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                moveKeyboardHighlight(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                moveKeyboardHighlight(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                collapseHighlightedGroup();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                expandHighlightedGroup();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                selectHighlightedSystem();
            }
        });

        // Clear keyboard highlight when clicking on system buttons
        $('#sidebarDefaultsButtons, #sidebarExtendedButtons').on('click', '.system-btn, .sidebar-sub-system-btn', clearKeyboardHighlight);

        $("#downloadImageBtn").click(downloadImageFormat);
        $("#copyImageBtn").click(copyImageToClipboard);
        $('#exportSettingsBtn').click(exportSettings);
        $('#importSettingsBtn').click(importSettings);

        // Animation control event handlers
        $('#playPauseBtn').on('click', togglePlayback);

        $('#frameSlider').on('input', function() {
            const frameIndex = parseInt($(this).val() as string);
            seekToFrame(frameIndex);
        });

        $('#consistentPaletteCheckbox').on('change', function() {
            consistentPalette = $(this).is(':checked');
            if (isAnimationMode) {
                reprocessAnimation();
            }
        });

        // Processing control buttons
        $('#processAllFramesBtn').on('click', () => {
            processAnimationFrames(0); // Start from frame 0 - process all frames
        });

        $('#cancelProcessingBtn').on('click', () => {
            animationProcessingAborted = true;
        });

        // Download current frame button
        $('#downloadFrameBtn').on('click', downloadCurrentFrame);

        // Source playback controls
        $('#sourcePlayPauseBtn').on('click', toggleSourcePlayback);
    });

    // print diags (TODO: generate markdown table)
    if (window.location.search == '?printmeta') {
        function printSystems() {
            var s = "";
            SYSTEMS.forEach((sys) => {
                if (sys) s += "* " + sys.name + " - " + getSystemInfo(sys) + "\n";
            });
            console.log(s);
        }
        printSystems();
    }

}

startUI();
