import { SYSTEMS, SYSTEM_LOOKUP } from "../settings/systems";
import { DitherSetting, DithertronSettings, PixelsAvailableMessage } from "../common/types";
import { SYSTEM_CATEGORIES, findSystemCategory, SystemButton, SystemCategory } from "../settings/system-categories";

import * as exportfuncs from "../export/exportfuncs";
import * as fileviewers from "../export/fileviewers";
import * as kernels from "../dither/kernels";

import Cropper from 'cropperjs';
import pica from 'pica';
import { saveAs } from 'file-saver';
import { EXAMPLE_IMAGES } from "./sampleimages";

var cropper : Cropper;
var letterboxMode = false;
var cropEnabled = false; // Crop tool is disabled by default

// System IDs list for keyboard navigation
var allSystemIds: string[] = [];

// Mutable palette for color picker feature
var currentPalette: Uint32Array | null = null;
var originalPalette: Uint32Array | null = null;
var paletteModified = false;
var optimalPaletteCaptured = false; // Track if we've captured the optimal palette from worker
var paletteLocked = false; // Track if palette is locked (prevents regeneration on crop changes)

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

function populateDitherButtons() {
    const container = $('#ditherButtonGroup');
    container.empty();
    ALL_DITHER_SETTINGS.forEach((dset, index) => {
        const btn = $('<button type="button" class="dither-btn"></button>')
            .text(dset.name)
            .attr('data-dither-index', index);
        if (index === 0) btn.addClass('active');
        container.append(btn);
    });
}

function populateSystemSidebar() {
    const container = $('#systemAccordion');
    container.empty();

    // Create alphabetically sorted list of system buttons
    const sortedSystems = SYSTEMS
        .filter(sys => sys !== null)
        .sort((a, b) => a!.name.localeCompare(b!.name));

    sortedSystems.forEach(sys => {
        if (sys) {
            const btn = $('<button type="button" class="system-btn"></button>')
                .text(sys.name)
                .attr('data-system-id', sys.id);
            container.append(btn);
        }
    });
}

// Track currently expanded button in tabbed selector
var expandedButtonId: string | null = null;
var activeTabId: string = 'defaults';

function populateSystemTabs() {
    SYSTEM_CATEGORIES.forEach(category => {
        const containerId = category.id + 'Buttons';
        const container = $(`#${containerId}`);
        container.empty();

        category.systems.forEach(button => {
            const btn = $('<button type="button" class="system-tab-btn"></button>')
                .text(button.label)
                .attr('data-button-id', button.id)
                .attr('data-system-id', button.systemId)
                .attr('data-category', category.id);

            if (button.subSystems && button.subSystems.length > 0) {
                btn.append(' <span class="dropdown-arrow"><i class="fa fa-caret-down"></i></span>');
                btn.attr('data-has-subsystems', 'true');
            }

            container.append(btn);
        });
    });
}

function showSubSystems(categoryId: string, button: SystemButton) {
    // Hide all sub-system rows
    $('.sub-systems-row').removeClass('visible');

    // Remove expanded state from all buttons
    $('.system-tab-btn').removeClass('expanded');

    const subSystemsRowId = categoryId + 'SubSystems';
    const row = $(`#${subSystemsRowId}`);
    row.empty();

    if (button.subSystems && button.subSystems.length > 0) {
        // Include the default system (button.systemId) as the first option
        const allSubSystems = [button.systemId, ...button.subSystems];

        allSubSystems.forEach(subId => {
            const sys = SYSTEM_LOOKUP[subId];
            if (sys) {
                const subBtn = $('<button type="button" class="sub-system-btn"></button>')
                    .text(sys.name)
                    .attr('data-system-id', subId)
                    .attr('data-parent-button-id', button.id);
                row.append(subBtn);
            }
        });
        row.addClass('visible');
        $(`.system-tab-btn[data-button-id="${button.id}"]`).addClass('expanded');
        expandedButtonId = button.id;
    }
}

function hideSubSystems() {
    $('.sub-systems-row').removeClass('visible');
    $('.system-tab-btn').removeClass('expanded');
    expandedButtonId = null;
}

function switchTab(tabId: string) {
    activeTabId = tabId;
    // Update tab buttons
    $('.system-tab').removeClass('active');
    $(`.system-tab[data-tab="${tabId}"]`).addClass('active');

    // Update tab content
    $('.system-tab-content').removeClass('active');
    $(`.system-tab-content[data-tab-content="${tabId}"]`).addClass('active');

    // Hide any expanded sub-systems
    hideSubSystems();
}

function updateTabbedSelectorDisplay(sys: DithertronSettings) {
    // Remove active class from all buttons
    $('.system-tab-btn').removeClass('active');
    $('.sub-system-btn').removeClass('active');

    // Find which category this system belongs to
    const found = findSystemCategory(sys.id);
    if (!found) return;

    // Switch to the correct tab if needed
    if (found.category.id !== activeTabId) {
        switchTab(found.category.id);
    }

    if (found.isSubSystem && found.parentButton) {
        // This is a sub-system, highlight parent and show sub-systems
        $(`.system-tab-btn[data-button-id="${found.parentButton.id}"]`).addClass('active');

        // Find the full parent button data
        const parentBtn = found.category.systems.find(b => b.id === found.parentButton!.id);
        if (parentBtn) {
            showSubSystems(found.category.id, parentBtn);
        }

        // Highlight the sub-system button
        $(`.sub-system-btn[data-system-id="${sys.id}"]`).addClass('active');
    } else {
        // This is a main system button
        $(`.system-tab-btn[data-system-id="${sys.id}"]`).addClass('active');

        // If sub-systems are expanded for this button, also highlight in the sub-systems row
        if (expandedButtonId) {
            $(`.sub-system-btn[data-system-id="${sys.id}"]`).addClass('active');
        }
    }
}

// Get list of system IDs in the active tab for keyboard navigation
function getActiveTabSystemIds(): string[] {
    const category = SYSTEM_CATEGORIES.find(c => c.id === activeTabId);
    if (!category) return [];

    // If sub-systems are expanded, return default + sub-system IDs
    if (expandedButtonId) {
        const button = category.systems.find(b => b.id === expandedButtonId);
        if (button?.subSystems) {
            return [button.systemId, ...button.subSystems];
        }
    }

    // Otherwise return main button system IDs
    return category.systems.map(b => b.systemId);
}

// Navigate within tabbed selector (Left/Right)
function selectTabbedSystemByOffset(offset: number) {
    const systemIds = getActiveTabSystemIds();
    if (systemIds.length === 0) return;

    const currentId = dithertron.settings.id;
    let currentIndex = systemIds.indexOf(currentId);

    // If current system not in this list, start at beginning (or end for negative offset)
    if (currentIndex < 0) {
        currentIndex = offset > 0 ? -1 : systemIds.length;
    }

    let newIndex = currentIndex + offset;

    // Wrap around
    if (newIndex < 0) newIndex = systemIds.length - 1;
    if (newIndex >= systemIds.length) newIndex = 0;

    const newId = systemIds[newIndex];
    if (SYSTEM_LOOKUP[newId]) {
        setTargetSystem(SYSTEM_LOOKUP[newId]);
    }
}

function setupTabbedSelectorEvents() {
    // Tab switching
    $(document).on('click', '.system-tab', function() {
        const tabId = $(this).attr('data-tab');
        if (tabId) {
            switchTab(tabId);
        }
    });

    // Main system button clicks
    $(document).on('click', '.system-tab-btn', function(e) {
        const buttonId = $(this).attr('data-button-id');
        const systemId = $(this).attr('data-system-id');
        const hasSubsystems = $(this).attr('data-has-subsystems') === 'true';
        const categoryId = $(this).attr('data-category');

        if (hasSubsystems && categoryId) {
            // Find the button data
            const category = SYSTEM_CATEGORIES.find(c => c.id === categoryId);
            const button = category?.systems.find(b => b.id === buttonId);

            if (button) {
                if (expandedButtonId === buttonId) {
                    // Already expanded, collapse it - don't change selected system
                    hideSubSystems();
                    return;
                } else {
                    // Expand this button's sub-systems
                    showSubSystems(categoryId, button);

                    // Check if current system is already one of this button's systems
                    const allButtonSystems = [button.systemId, ...(button.subSystems || [])];
                    if (allButtonSystems.includes(dithertron.settings.id)) {
                        // Already have a system from this group selected, highlight it and don't change
                        $(`.sub-system-btn[data-system-id="${dithertron.settings.id}"]`).addClass('active');
                        return;
                    }
                }
            }
        }

        // Select the system (only if not collapsing and not already in this group)
        if (systemId && SYSTEM_LOOKUP[systemId]) {
            setTargetSystem(SYSTEM_LOOKUP[systemId]);
        }
    });

    // Sub-system button clicks
    $(document).on('click', '.sub-system-btn', function(e) {
        e.stopPropagation();
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

function filterSystems(searchTerm: string) {
    const term = searchTerm.toLowerCase().trim();
    const sidebar = $('#systemSidebar');

    if (!term) {
        // Show all systems
        sidebar.find('.system-btn').removeClass('d-none');
        return;
    }

    // Filter systems and show matching ones
    sidebar.find('.system-btn').each(function() {
        const btn = $(this);
        const name = btn.text().toLowerCase();
        const id = (btn.attr('data-system-id') || '').toLowerCase();
        const matches = name.includes(term) || id.includes(term);
        btn.toggleClass('d-none', !matches);
    });
}

function updateCurrentSystemDisplay(sys: DithertronSettings) {
    $('#currentSystemName').text(sys.name);
    // Update active state in sidebar
    $('.system-btn').removeClass('active');
    $(`.system-btn[data-system-id="${sys.id}"]`).addClass('active');
    // Update tabbed selector display
    updateTabbedSelectorDisplay(sys);
}

function toggleLetterboxMode() {
    letterboxMode = !letterboxMode;
    $('#letterboxToggle').toggleClass('active', letterboxMode);

    // Reload the source image to apply new cropper settings
    if (cropper) {
        loadSourceImage((cropper as any).url);
    }
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

// Select system by offset (for arrow key navigation)
function selectSystemByOffset(offset: number) {
    const currentId = dithertron.settings.id;
    const currentIndex = allSystemIds.indexOf(currentId);
    let newIndex = currentIndex + offset;

    // Wrap around
    if (newIndex < 0) newIndex = allSystemIds.length - 1;
    if (newIndex >= allSystemIds.length) newIndex = 0;

    const newId = allSystemIds[newIndex];
    setTargetSystem(SYSTEM_LOOKUP[newId]);
    scrollSystemIntoView(newId);
}

// Scroll the selected system button into view
function scrollSystemIntoView(sysId: string) {
    const btn = $(`.system-btn[data-system-id="${sysId}"]`);
    if (btn.length) {
        btn[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Navigate dither methods by offset (for left/right arrow key navigation)
function selectDitherMethodByOffset(offset: number) {
    const buttons = $('.dither-btn');
    if (buttons.length === 0) return;

    const activeBtn = $('.dither-btn.active');
    let currentIndex = activeBtn.length > 0 ? buttons.index(activeBtn) : -1;

    let newIndex = currentIndex + offset;

    // Wrap around
    if (newIndex < 0) newIndex = buttons.length - 1;
    if (newIndex >= buttons.length) newIndex = 0;

    // Trigger click on the new button
    $(buttons[newIndex]).trigger('click');
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
    // Read dither selection from active button
    const activeDitherBtn = $('.dither-btn.active');
    if (activeDitherBtn.length > 0) {
        const ditherIndex = parseInt(activeDitherBtn.attr('data-dither-index') || '0');
        dithertron.settings.ditherfn = ALL_DITHER_SETTINGS[ditherIndex].kernel;
    }
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
    $('.dither-btn').removeClass('active').first().addClass('active');
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

    if (letterboxMode) {
        // Letterbox mode: fit image within target dimensions, fill rest with black
        const targetWidth = resizeCanvas.width;
        const targetHeight = resizeCanvas.height;
        const sourceWidth = cropCanvas.width;
        const sourceHeight = cropCanvas.height;

        // Calculate scale to fit within target while maintaining aspect ratio
        const scaleX = targetWidth / sourceWidth;
        const scaleY = targetHeight / sourceHeight;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = Math.round(sourceWidth * scale);
        const scaledHeight = Math.round(sourceHeight * scale);

        // Create intermediate canvas at scaled size
        const intermediateCanvas = document.createElement('canvas');
        intermediateCanvas.width = scaledWidth;
        intermediateCanvas.height = scaledHeight;

        // Resize source to intermediate canvas
        pica().resize(cropCanvas, intermediateCanvas, {}).then(() => {
            // Clear resizeCanvas to black
            const ctx = resizeCanvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetWidth, targetHeight);

            // Center the scaled image on resizeCanvas
            const offsetX = Math.round((targetWidth - scaledWidth) / 2);
            const offsetY = Math.round((targetHeight - scaledHeight) / 2);
            ctx.drawImage(intermediateCanvas, offsetX, offsetY);

            reprocessImage();
        }).catch((err) => {
            showFingerprintError(err);
        });
    } else {
        // Normal mode: stretch to fill target dimensions
        pica().resize(cropCanvas, resizeCanvas, {
            /*
            unsharpAmount: 50,
            unsharpRadius: 0.5,
            unsharpThreshold: 2
            */
        }).then(() => {
            reprocessImage();
        }).catch((err) => {
            showFingerprintError(err);
        });
    }
}

function getSystemInfo(sys: DithertronSettings) {
    var s = sys.width + " x " + sys.height;
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
            optimalPaletteCaptured = true;
        }

        // Use locked/modified palette for display if available, otherwise use worker's palette
        const displayPalette = (paletteLocked || paletteModified) && currentPalette ? currentPalette : pal;

        displayPalette.forEach((col, index) => {
            var rgb = "rgb(" + (col & 0xff) + "," + ((col >> 8) & 0xff) + "," + ((col >> 16) & 0xff) + ")";
            var sq = $('<span class="palette-swatch palette-swatch-clickable">&nbsp;</span>')
                .css("background-color", rgb)
                .attr('data-index', index);
            swat.append(sq);
        });

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

function onSwatchClick(e: JQuery.ClickEvent) {
    const index = parseInt($(e.currentTarget).attr('data-index') || '0');
    if (currentPalette == null || index >= currentPalette.length) return;

    // Get current color and set color picker value
    const currentColor = uint32ToHex(currentPalette[index]);
    $('#colorPickerInput').val(currentColor);
    $('#colorPickerPanel').attr('data-swatch-index', index.toString());

    // Show the color picker panel
    $('#colorPickerPanel').show();
}

function onColorPickerAccept() {
    const panel = $('#colorPickerPanel');
    const index = parseInt(panel.attr('data-swatch-index') || '0');
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

    // Hide the picker panel
    panel.hide();

    // Update the settings palette and re-dither
    dithertron.settings.pal = currentPalette;
    resetImage();
}


function resetPalette() {
    if (originalPalette == null) return;

    // Restore original palette
    currentPalette = new Uint32Array(originalPalette);
    paletteModified = false;

    // Update settings and re-dither
    dithertron.settings.pal = currentPalette;
    resetImage();
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
    } else {
        originalPalette = new Uint32Array(sys.pal);
        currentPalette = new Uint32Array(sys.pal);
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
    const settings = dithertron.settings;
    let aspect = (settings.width * (settings.scaleX || 1) / settings.height) || (4 / 3);

    const cropperOptions: Cropper.Options = {
        viewMode: 1,
        autoCropArea: 1.0,
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

    // Only force aspect ratio if crop is enabled and not in letterbox mode
    if (cropEnabled && !letterboxMode) {
        cropperOptions.aspectRatio = aspect;
    }

    cropper = new Cropper(sourceImage, cropperOptions);
    cropper.replace(url);
    updateURL();
}

function setTargetSystem(sys: DithertronSettings) {
    var showNoise = sys.conv != 'DitheringCanvas';
    // Initialize mutable palette before setting up worker
    initializePaletteFromSystem(sys);
    dithertron.newWorker();
    dithertron.setSettings(sys);
    dithertron.restart();
    showSystemInfo(sys);
    resizeCanvas.width = destCanvas.width = sys.width;
    resizeCanvas.height = destCanvas.height = sys.height;
    let pixelAspect = sys.scaleX || 1;
    (destCanvas.style as any).aspectRatio = (sys.width * pixelAspect / sys.height).toString();
    $("#noiseSection").css('display', showNoise ? 'flex' : 'none');
    $("#diversitySection").css('display', sys.reduce ? 'flex' : 'none');
    if (cropper) {
        loadSourceImage((cropper as any).url); // TODO?
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
function downloadImageFormat() {
    destCanvas.toBlob((blob) => {
        saveAs(blob, getFilenamePrefix() + ".png");
    }, "image/png");
}
async function copyImageToClipboard() {
    try {
        const blob = await new Promise<Blob>((resolve, reject) => {
            destCanvas.toBlob((b) => {
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

        document.querySelector('input[type="file"]').addEventListener('change', function (event) {
            var inputElement = event.target as HTMLInputElement;
            var file = inputElement.files && inputElement.files[0];
            if (file) {
                filenameLoaded = file.name;
                presetLoaded = "";
                var url = URL.createObjectURL(file);
                loadSourceImage(url);
            }
        });

        EXAMPLE_IMAGES.forEach((filename) => {
            $('<a class="dropdown-item" href="#"></a>').text(filename).appendTo("#examplesMenu");
        });

        $("#examplesMenu").click((e) => {
            var filename = $(e.target).text();
            filenameLoaded = presetLoaded = filename;
            loadSourceImage("images/" + filename);
            imageUpload.value = "";
        });

        // Populate button groups
        populateDitherButtons();
        populateErrorFuncButtons();
        populateSystemSidebar();
        populateSystemTabs();
        setupTabbedSelectorEvents();
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
        loadSourceImage("images/" + filenameLoaded);

        $("#diffuseSlider").on('change', resetImage);
        $("#orderedSlider").on('change', resetImage);
        $("#noiseSlider").on('change', resetImage);
        $("#diversitySlider").on('change', reprocessImage);
        $("#brightSlider").on('change', reprocessImage);
        $("#contrastSlider").on('change', reprocessImage);
        $("#saturationSlider").on('change', reprocessImage);
        $("#resetSourceSliders").on('click', resetSourceSliders);
        $("#resetDitherSliders").on('click', resetDitherSliders);

        // Error function buttons
        $('#errorFuncGroup').on('click', '.error-func-btn', function() {
            $('.error-func-btn').removeClass('active');
            $(this).addClass('active');
            resetImage();
        });

        // Diff method dropdown toggle
        $('#diffMethodToggle').on('click', function() {
            $(this).toggleClass('expanded');
            $('#diffMethodDropdown').toggleClass('visible');
        });

        // Dither buttons
        $('#ditherButtonGroup').on('click', '.dither-btn', function() {
            $('.dither-btn').removeClass('active');
            $(this).addClass('active');
            // Update the dropdown label with selected method
            $('#diffMethodLabel').text($(this).text());
            resetImage();
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
            filterSystems($(this).val() as string);
        });

        // System buttons in sidebar
        $('#systemSidebar').on('click', '.system-btn', function() {
            const sysId = $(this).attr('data-system-id');
            if (sysId && SYSTEM_LOOKUP[sysId]) {
                setTargetSystem(SYSTEM_LOOKUP[sysId]);
                toggleSystemSidebar(false);
                $('#systemSearch').val('');
                filterSystems('');
            }
        });

        // Letterbox toggle
        $('#letterboxToggle').on('click', toggleLetterboxMode);

        // Crop toggle
        $('#cropToggle').on('click', toggleCropMode);

        // Create color picker panel and palette control buttons
        const colorPickerHtml = `
            <div id="colorPickerPanel" class="color-picker-panel" style="display:none;">
                <input type="color" id="colorPickerInput" class="color-picker-input">
                <button type="button" class="btn btn-sm btn-primary" id="colorPickerAcceptBtn">Apply</button>
            </div>
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

        // Palette swatch click handler
        $('#paletteSwatches').on('click', '.palette-swatch-clickable', onSwatchClick);

        // Color picker event handlers
        $('#colorPickerAcceptBtn').on('click', onColorPickerAccept);

        // Lock palette button handler
        $('#lockPaletteBtn').on('click', togglePaletteLock);

        // Reset palette button handler
        $('#resetPaletteBtn').on('click', resetPalette);

        // Keyboard navigation for system selection and diff method
        $(document).on('keydown', (e) => {
            // Only handle if not focused on an input
            if ($(e.target).is('input, textarea')) return;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectSystemByOffset(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectSystemByOffset(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                // If diff method dropdown is open, navigate within it
                if ($('#diffMethodDropdown').hasClass('visible')) {
                    selectDitherMethodByOffset(-1);
                } else {
                    selectTabbedSystemByOffset(-1);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                // If diff method dropdown is open, navigate within it
                if ($('#diffMethodDropdown').hasClass('visible')) {
                    selectDitherMethodByOffset(1);
                } else {
                    selectTabbedSystemByOffset(1);
                }
            }
        });

        $("#downloadImageBtn").click(downloadImageFormat);
        $("#copyImageBtn").click(copyImageToClipboard);
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
