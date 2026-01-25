# Dithertron Backlog

## Epics

### System Selector Refactoring

**Goal:** Redesign the system selector to provide better organization, discoverability, and navigation. Replace the current flat sidebar list with a tabbed, horizontally-oriented button system that supports sub-system expansion and keyboard navigation.

**Reference File:** `SYSTEM_CATEGORIES.md` - Defines which systems belong in each tab (Defaults/Expanded/Non-Standard) and their sub-system relationships.

**Current Problems:**
- All 86 systems displayed as a single flat scrollable list
- No logical grouping or categorization
- Poor discoverability - must scroll or search to find systems
- Related system variants (e.g., C-64 Multi FLI variants) are scattered
- Sidebar takes up screen real estate on desktop

**Target Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│                        Convert to:                              │
│  ┌──────────┬──────────┬─────────┐                              │
│  │ Defaults │ Expanded │ Non-Std │  ← Tab headers               │
│  └──────────┴──────────┴─────────┘                              │
│  ┌─────┐ ┌─────┐ ┌───────┐ ┌────┐ ┌─────┐                       │
│  │C-64▼│ │C-64 │ │  NES  │ │ GB │ │ ZX ▼│ ...  ← System buttons │
│  │Multi│ │Hires│ │       │ │    │ │Spec │                       │
│  └─────┘ └─────┘ └───────┘ └────┘ └─────┘                       │
│  ┌─────────────────────────────────────┐                        │
│  │ FLI │ FLI+bug │ L-blank │ L/R-blank │  ← Expanded sub-systems│
│  └─────────────────────────────────────┘                        │
│  ┌───────────────┐ ┌───────────────┐                            │
│  │  Copy Image   │ │ Download PNG  │  ← Action buttons          │
│  └───────────────┘ └───────────────┘                            │
├─────────────────────────────────────────────────────────────────┤
│                     [Rendered Image]                            │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Three tabs: Defaults (common platforms), Expanded (retro computing), Non-Standard (specialized formats)
- Horizontal button layout within each tab
- Dropdown arrows on buttons with sub-systems (variants)
- Clicking dropdown expands a sub-system row below
- Keyboard: Left/Right to navigate buttons, Left/Right within expanded sub-systems
- Sidebar on right becomes collapsible (expand/collapse toggle)
- Current sidebar list still functional when expanded

#### Stories - COMPLETED

##### Story A1: Create System Categories Data Structure ✓
**Description:** Create TypeScript data structures to represent the categorized systems based on `SYSTEM_CATEGORIES.md`

**Acceptance Criteria:**
- [x] TypeScript types defined for categories and buttons
- [x] Categories data matches `SYSTEM_CATEGORIES.md`
- [x] Sub-systems properly linked to parent buttons
- [x] Data is importable by UI code

---

##### Story A2: Build Tabbed System Selector Component ✓
**Description:** Create the new horizontal system selector UI with tab navigation

**Acceptance Criteria:**
- [x] Three tabs visible above rendered image area
- [x] Clicking tab switches visible content
- [x] Active tab is visually distinguished
- [x] Tabs are responsive on mobile

---

##### Story A3: Implement Horizontal System Buttons ✓
**Description:** Create horizontally-laid-out system buttons within each tab

**Acceptance Criteria:**
- [x] Buttons laid out horizontally within tab content
- [x] Buttons wrap to next row if needed
- [x] Dropdown arrows visible on buttons with sub-systems
- [x] Active system is highlighted
- [x] Clicking button selects that system

---

##### Story A4: Implement Sub-System Expansion ✓
**Description:** Add expandable sub-system rows when clicking dropdown arrows

**Acceptance Criteria:**
- [x] Clicking dropdown arrow expands sub-system row
- [x] Sub-systems displayed horizontally in expansion row
- [x] Clicking again collapses the row
- [x] Only one expansion open at a time
- [x] Selecting sub-system highlights both parent and sub-system

---

##### Story A5: Keyboard Navigation for New Selector ✓
**Description:** Implement Left/Right keyboard navigation through system buttons

**Acceptance Criteria:**
- [x] Left/Right arrows move selection through buttons
- [x] Navigation wraps at row ends
- [x] Sub-system navigation works when expanded
- [x] Focus indicator visible on keyboard navigation
- [x] No conflict with existing keyboard shortcuts

---

##### Story A6: Make Sidebar Collapsible ✓
**Description:** Add expand/collapse toggle for the full system list sidebar on the right

**Acceptance Criteria:**
- [x] Toggle button visible in sidebar header
- [x] Clicking toggle collapses/expands sidebar
- [x] Smooth animation on collapse/expand
- [x] Both selectors show same active system
- [x] Sidebar still works with keyboard (Up/Down) when expanded

---

##### Story A7: Synchronize Both Selectors ✓
**Description:** Ensure the new tabbed selector and sidebar stay synchronized

**Acceptance Criteria:**
- [x] Selecting in either UI updates the other
- [x] Correct tab activates when system is in different category
- [x] Sub-system expansion opens if sub-system selected via sidebar
- [x] URL reflects current system selection

---

##### Story A8: Mobile Responsive Behavior ✓
**Description:** Ensure the new system selector works well on mobile devices

**Acceptance Criteria:**
- [x] Tabs usable on mobile (touch-friendly)
- [x] Buttons have adequate touch target size
- [x] Sub-system expansion works on mobile
- [x] No horizontal overflow on mobile

---

### UI Refinements

**Goal:** Streamline the UI by consolidating controls, reducing visual clutter, and improving layout consistency.

#### Stories

##### Story B1: Consolidate Source Image Controls ✓
- [x] Make "Select an example" dropdown and "Choose File" input on one line
- [x] Remove "or upload an image" text

---

##### Story B2: Move Header Elements ✓
- [x] Move "DITHERTRON 2.0" from center to left side
- [x] Move PNG download button and Copy button to header (left of Systems button)

---

##### Story B3: Remove Convert To Section ✓
- [x] Remove the "Convert to:" label and Letterbox button section entirely
- [x] Move format info text ("304 x 256, 16 out of 256 colors") below rendered image, above color palette

---

##### Story B4: Reorganize Tabbed Selector ✓
- [x] Move Letterbox button to right side of tab headers (Defaults | Expanded | Defunct | [Letterbox])
- [x] Rename "Non-Standard" tab to "Defunct"

---

##### Story B5: Simplify Slider Panels ✓
- [x] Remove "Source Adjustments" and "Dither Settings" header text
- [x] Move Reset buttons down to be inline with sliders (same row as first slider)

---

#### Implementation Order
1. Story B4 - Tab reorganization (quick change)
2. Story B1 - Source controls consolidation
3. Story B3 - Remove Convert To section
4. Story B2 - Header reorganization
5. Story B5 - Slider panel simplification

---

### Palette Locking Feature

**Goal:** Allow users to lock the color palette and adjust the crop zone without automatically regenerating the palette.

**Current Problem:**
- For systems with palette reduction (e.g., Amiga, CPC), the optimal palette is auto-generated from the cropped image
- Each time the user adjusts the crop, a new palette is generated
- No way to preserve a preferred palette across crop changes
- Users may want to lock in a palette they like and then explore different crop compositions with that same palette

**Use Cases:**
- Lock a palette that works well for the overall image, then adjust cropping for composition
- Compare how different parts of an image look with the same locked palette
- Maintain color consistency across multiple crops of the same source image

#### Stories

##### Story C1: Add Palette Lock Button ✓
- [x] Add "Lock Palette" button next to "Reset Colors" button
- [x] Button should toggle between locked/unlocked states (visual indicator)
- [x] When locked, palette should not regenerate on crop changes
- [x] Locked state should persist until manually unlocked

---

##### Story C2: Implement Palette Lock Logic ✓
- [x] Track palette lock state (`paletteLocked` boolean)
- [x] When palette is locked, preserve `currentPalette` across crop/image changes
- [x] Use locked palette in settings for dithering instead of generating new one
- [x] Display locked palette in swatches instead of worker-generated palette
- [x] For systems without palette reduction: lock button hidden

---

##### Story C3: Palette Lock UX Refinements ✓
- [x] Show visual indicator when palette is locked (button changes to warning/locked state)
- [x] Automatically lock palette when user manually edits a color
- [x] Unlock palette automatically when switching to a different system
- [x] Add tooltip explaining what palette lock does
- [ ] Consider adding to keyboard shortcuts (e.g., 'L' to toggle lock)

---

### Aspect Ratio Matching (Replace Letterbox)

**Goal:** Match the rendered image aspect ratio 1:1 with the source image by expanding the system's native canvas dimensions. This replaces letterbox mode and is designed for visual preview/PNG export only (not hardware output).

**Current Behavior:**
- Each system has a fixed native resolution (e.g., 320x200 for CGA, 256x240 for NES)
- The cropper forces the source image to match the system's aspect ratio
- Users must crop their source to fit the target system's aspect ratio
- Letterbox mode fits the image without cropping but adds black bars

**New Behavior:**
- The rendered canvas expands to match the source image's natural aspect ratio
- Expansion is achieved by tiling/repeating the native resolution (adding rows or columns)
- Native dimensions are never shrunk, only expanded
- Dithering happens at the expanded resolution
- The final output maintains the source image's composition without cropping or letterboxing

**Example:**
```
System: CGA 320x200 (1.6:1 aspect ratio)
Source: 1600x1200 photo (4:3 = 1.33:1 aspect ratio)

Source is taller than native (1.33 < 1.6), so we expand height:
- Keep width at 320
- Calculate height: 320 / 1.33 = 240
- Render at 320x240 (matching source's 4:3 aspect)
- Dithering uses same math, just more scanlines
```

**Technical Considerations:**
- Block-based systems (ZX Spectrum 8x8, C64 4x8): Expanded dimensions should be multiples of block size
- Systems with `scaleX` (non-square pixels): Account for pixel aspect ratio in calculations
- The cropper no longer forces aspect ratio - it crops within the source's natural ratio
- Settings like `width`/`height` become minimum values, not fixed values

**Replaces:** Letterbox mode toggle button

#### Stories

##### Story D1: Calculate Expanded Canvas Dimensions ✓
- [x] Create function to calculate expanded dimensions from source aspect ratio + system native size
- [x] Ensure expanded dimensions are multiples of system block size (if applicable)
- [x] Account for `scaleX` (pixel aspect ratio) in calculations
- [x] Always expand (never shrink) - take max of native and calculated dimension
- [x] Write unit tests for dimension calculations (13 tests in test-dimensions.ts)

**Acceptance Criteria:**
- [x] Given source 4:3 and system 320x200, output is 320x240
- [x] Given source 16:9 and system 320x200, output is 356x200 (rounded to block boundary)
- [x] Given source 1:1 and system 320x200, output is 320x320
- [x] Block-based systems round up to valid block boundaries

---

##### Story D2: Update Cropper to Use Source Aspect Ratio ✓
- [x] Remove forced aspect ratio constraint from cropper initialization
- [x] Allow free-form cropping within the source image
- [x] Cropper still respects minimum dimensions based on system native size
- [x] Update crop event handler to recalculate canvas dimensions on crop change

**Acceptance Criteria:**
- [x] Cropper no longer forces system aspect ratio
- [x] User can crop any region of source image
- [x] Changing crop area triggers canvas dimension recalculation

---

##### Story D3: Modify Resize Canvas to Support Dynamic Dimensions ✓
- [x] Update `resizeCanvas` to use calculated dimensions instead of fixed system size
- [x] Ensure resize canvas dimensions match the expanded target
- [x] Update `convertImage()` to use dynamic dimensions
- [x] Verify source image is properly scaled to fill expanded canvas

**Acceptance Criteria:**
- [x] Resize canvas dimensions match calculated expanded size
- [x] Source image fills entire canvas (no letterboxing)
- [x] Image is not distorted (maintains source aspect ratio)

---

##### Story D4: Update Dithering to Work at Expanded Resolution ✓
- [x] Pass expanded dimensions to dithertron settings
- [x] Verify dithering math works correctly at non-native resolutions
- [x] Test block-based systems render correctly with expanded dimensions
- [x] Ensure palette generation considers full expanded image

**Acceptance Criteria:**
- [x] Dithering produces correct output at expanded resolutions
- [x] Block constraints are maintained (no partial blocks at edges)
- [x] Palette reduction considers entire expanded image

---

##### Story D5: Update Rendered Canvas Display ✓
- [x] Rendered canvas displays at expanded dimensions
- [x] Canvas maintains correct aspect ratio in display
- [x] Format info text shows expanded dimensions (e.g., "320 x 240" instead of "320 x 200")
- [x] PNG download exports at expanded resolution

**Acceptance Criteria:**
- [x] Rendered image matches source aspect ratio visually
- [x] PNG export is at full expanded resolution
- [x] Format info accurately reflects expanded dimensions

---

##### Story D6: Remove Letterbox Mode ✓
- [x] Remove letterbox toggle button from UI
- [x] Remove letterbox-related code from cropper initialization
- [x] Remove letterbox state tracking
- [x] Clean up any letterbox CSS/styles

**Acceptance Criteria:**
- [x] Letterbox button no longer appears
- [x] No letterbox-related code remains
- [x] New aspect matching is the default (and only) behavior

---

##### Story D7: Make Crop Tool Optional (Off by Default) ✓
- [x] Disable cropper by default - source image displays without crop handles
- [x] Add "Crop" toggle button to source image controls (near file input)
- [x] When crop is disabled: use full source image, no resize handles shown
- [x] When crop is enabled: show cropper with drag/resize handles
- [x] Persist crop state when toggling (cropper clear/disable preserves state)
- [x] Update UI to clearly indicate crop mode status (active button style)

**Acceptance Criteria:**
- [x] New images load without crop tool active
- [x] Toggle button enables/disables crop handles
- [x] Full source image is used when crop is disabled
- [x] Crop area is preserved when toggling on/off

---

##### Story D8: Comprehensive Testing Suite ✓
- [x] Add unit tests for dimension calculation function (Story D1) - 13 tests in test-dimensions.ts
- [x] Add unit tests for block boundary rounding
- [x] Add integration tests for cropper behavior (enabled/disabled states)
- [x] Test all existing systems still produce valid output
- [x] Test palette reduction works correctly at expanded resolutions
- [x] Test PNG export at expanded dimensions
- [x] Test slider adjustments (brightness, contrast, etc.) work at expanded size

**Acceptance Criteria:**
- [x] All new dimension calculation logic has unit test coverage
- [x] Existing dithering tests pass with aspect ratio changes (386 tests pass)
- [x] No regressions in current functionality

---

##### Story D9: Handle Edge Cases and System Variations ✓
- [x] Test with systems that have extreme aspect ratios
- [x] Test with systems that have large block sizes (STIC, VCS)
- [x] Test with systems that have `scaleX` != 1 (non-square pixels)
- [x] Test with very wide and very tall source images
- [x] Add reasonable limits to prevent excessive canvas expansion (never shrinks below native)
- [x] Test crop toggle works correctly with all system types
- [x] Test switching systems while crop is disabled/enabled

**Acceptance Criteria:**
- [x] All system types produce valid output
- [x] No crashes or rendering errors with extreme aspect ratios
- [x] Canvas expansion has reasonable upper bounds
- [x] Crop toggle works consistently across all systems

---

#### Implementation Order
1. Story D1 - Dimension calculation (foundation)
2. Story D7 - Make crop tool optional (enables simpler default flow)
3. Story D2 - Cropper changes for source aspect ratio
4. Story D3 - Resize canvas changes
5. Story D4 - Dithering verification
6. Story D5 - Display updates
7. Story D6 - Remove letterbox
8. Story D8 - Testing suite
9. Story D9 - Edge cases and testing

---

### Image Area Layout & Alignment

**Goal:** Create a clean, aligned layout where both image areas (source and rendered) are properly sized, aligned with their respective UI controls, and vertically centered in the available viewport space.

**Current Problems:**
- Source image (cropper) width doesn't match the blue UI panel above it
- Rendered image uses hardcoded `width: 85%` and doesn't fill its column
- No consistent gutter/spacing between the two image columns
- Images aren't vertically centered between the top UI and bottom sliders
- Layout doesn't properly calculate available height (header + top UI + bottom sliders + footer)

**Target Layout:**
```
┌─────────────────────────────────────────────────────────┐
│                    DITHERTRON 2.0                       │
├───────────────────────────┬─────────────────────────────┤
│ [Blue UI: Select image]   │ [Blue UI: Convert settings] │
├───────────────────────────┼─────────────────────────────┤
│                           │                             │
│   ┌─────────────────┐     │     ┌─────────────────┐     │
│   │                 │     │     │                 │     │
│   │  Source Image   │ gap │     │ Rendered Image  │     │
│   │   (cropper)     │     │     │   (canvas)      │     │
│   │                 │     │     │   + swatches    │     │
│   └─────────────────┘     │     └─────────────────┘     │
│                           │                             │
├───────────────────────────┼─────────────────────────────┤
│ [Gray: Source sliders]    │ [Gray: Dither sliders]      │
├───────────────────────────┴─────────────────────────────┤
│                    README | Books                       │
└─────────────────────────────────────────────────────────┘
```

---

## Stories

### Story 1: Restructure HTML for Flexbox Layout ✓
**Description:** Reorganize HTML structure to support proper flexbox-based vertical layout
**Tasks:**
- Wrap each column (left/right) in a flex container that spans from top UI to bottom sliders
- Create dedicated image container divs with proper flex properties
- Ensure the image containers can calculate available height

**Acceptance Criteria:**
- [x] Each side has a vertical flex container
- [x] Image areas are in dedicated containers
- [x] Structure supports dynamic height calculation

---

### Story 2: Calculate Available Image Area Height ✓
**Description:** Dynamically size the image area based on viewport minus fixed elements
**Tasks:**
- Calculate: viewport height - header - top UI - bottom sliders - footer - padding
- Apply this height to the image container area
- Handle window resize events

**Acceptance Criteria:**
- [x] Image area height adjusts to viewport (via flexbox)
- [x] Resizing window recalculates layout (automatic with flexbox)
- [x] No overflow or scrolling within main content

---

### Story 3: Align Source Image (Cropper) Column ✓
**Description:** Make the source image/cropper fill its column width and center vertically
**Tasks:**
- Remove any hardcoded widths from cropper container
- Set cropper to fill available width in its column
- Vertically center the cropper in its flex container
- Ensure cropper respects the calculated height

**Acceptance Criteria:**
- [x] Source image aligns with UI panel edges (padding: 0 0.75rem on .column-image)
- [x] Source image aligns with gray slider panel edges below
- [x] Cropper is vertically centered (align-items: center)

---

### Story 4: Align Rendered Image (Canvas) Column ✓
**Description:** Make the rendered canvas fill its column width while maintaining aspect ratio
**Tasks:**
- Remove `width: 85%` from `.emuvideo` class
- Set canvas to fill available width (with max-width constraint)
- Maintain aspect ratio using CSS or JS
- Include palette swatches in the centered content
- Vertically center canvas + swatches as a unit

**Acceptance Criteria:**
- [x] Rendered image aligns with UI panel edges (padding on .column-image)
- [x] Rendered image aligns with slider panel edges below
- [x] Canvas maintains correct aspect ratio (via JS aspectRatio property)
- [x] Palette swatches stay with the canvas (.rendered-container)
- [x] Content is vertically centered (align-items: center)

---

### Story 5: Add Consistent Gutter Between Columns ✓
**Description:** Create a clean white gap between source and rendered image areas
**Tasks:**
- Add consistent padding/gap between the two columns
- Ensure gutter is visible (white space)
- Gutter should run from top UI to bottom sliders

**Acceptance Criteria:**
- [x] Visible white gutter between image areas (gap: 1rem)
- [x] Gutter width is consistent
- [x] Gutter extends full height of image area

---

### Story 6: Handle Responsive/Mobile Layout ✓
**Description:** Ensure the layout works on smaller screens
**Tasks:**
- Stack columns vertically on mobile
- Adjust image sizing for single-column layout
- Test on various viewport sizes

**Acceptance Criteria:**
- [x] Layout stacks properly on mobile (flex-direction: column @767px)
- [x] Images remain properly sized on small screens (min-height: 30vh)
- [x] No horizontal scrolling on mobile

---

## Implementation Order

1. **Story 1** - Restructure HTML (foundation)
2. **Story 2** - Calculate heights (sizing foundation)
3. **Story 3** - Source image alignment
4. **Story 4** - Rendered image alignment
5. **Story 5** - Gutter spacing
6. **Story 6** - Mobile responsive fixes

---

## Technical Notes

**Key CSS Properties:**
- `display: flex; flex-direction: column` for vertical stacking
- `flex: 1` for flexible image area that fills remaining space
- `align-items: center; justify-content: center` for centering
- `object-fit: contain` for images to maintain aspect ratio
- `gap` property for consistent gutters

**JavaScript Considerations:**
- Cropper.js may need reinitialization on resize
- Canvas aspect ratio is set dynamically in `setTargetSystem()`
- May need to trigger layout recalculation after system change

**Current Aspect Ratio Handling:**
```javascript
// In ui.ts setTargetSystem():
let pixelAspect = sys.scaleX || 1;
(destCanvas.style as any).aspectRatio = (sys.width * pixelAspect / sys.height).toString();
```

---

### System Selector Consolidation

**Goal:** Consolidate the dual system selector UI (tabbed selector above rendered image + sidebar) into a single, cleaner collapsible drawer with tabbed navigation.

**Current Problems:**
- Two separate system selectors (tabbed above image + sidebar on right)
- Duplicated functionality between the two selectors
- Takes up valuable screen real estate above the rendered image
- Confusing to have two ways to select systems

**Target Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  DITHERTRON 2.0    [file] [example▼] | [PNG] [Copy] [Systems]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────┐     ┌─────────────────────────────────┐   │
│   │                 │     │  ┌─────────────────────────────┐│   │
│   │  Source Image   │     │  │ Search systems...           ││   │
│   │   (cropper)     │     │  └─────────────────────────────┘│   │
│   │                 │     │  ┌──────────┬──────────┐        │   │
│   └─────────────────┘     │  │ Defaults │ Extended │        │   │
│                           │  └──────────┴──────────┘        │   │
│   ┌─────────────────┐     │  ┌─────────────────────────────┐│   │
│   │                 │     │  │ C-64 Multi ▼                ││   │
│   │ Rendered Image  │     │  │ C-64 Hires                  ││   │
│   │                 │     │  │ NES                         ││   │
│   │ System Name     │     │  │ Game Boy                    ││   │
│   │ 320x200, 16 col │     │  │ ZX Spectrum ▼               ││   │
│   │ [palette]       │     │  │ ...                         ││   │
│   └─────────────────┘     │  └─────────────────────────────┘│   │
│                           └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Single collapsible drawer on right side
- Search bar at top of drawer (always visible)
- Two tabs: "Defaults" and "Extended"
- Defaults tab mirrors the curated button groups with sub-system expansion
- Extended tab contains expanded + defunct systems in vertical list
- Current system name displayed above format info (dimensions, colors)
- Remove duplicate tabbed selector above rendered image

#### Stories

##### Story S1: Add Tabs to Sidebar Drawer ✓
- [x] Add two-tab header to sidebar: "Defaults" and "Extended"
- [x] Keep search bar above the tabs
- [x] Tab switching shows appropriate content
- [x] Active tab visually distinguished

**Acceptance Criteria:**
- [x] Two tabs visible in sidebar
- [x] Clicking tab switches content
- [x] Search bar remains above tabs

---

##### Story S2: Populate Defaults Tab ✓
- [x] Display curated system buttons matching current tabbed selector
- [x] Support sub-system expansion (dropdown arrows)
- [x] Vertical button layout within the drawer
- [x] Active system highlighted

**Acceptance Criteria:**
- [x] Defaults tab shows same systems as current Defaults/Expanded/Defunct tabs combined into curated groups
- [x] Sub-system expansion works
- [x] Selected system is highlighted

---

##### Story S3: Populate Extended Tab ✓
- [x] Combine "Expanded" and "Defunct" category systems
- [x] Display as alphabetically sorted vertical list
- [x] Search filters this list
- [x] Active system highlighted

**Acceptance Criteria:**
- [x] Extended tab shows all expanded + defunct systems
- [x] Alphabetical ordering
- [x] Search works to filter list

---

##### Story S4: Display Current System Name ✓
- [x] Add system name display above format info (dimensions, colors)
- [x] Update when system changes
- [x] Style consistently with format info

**Acceptance Criteria:**
- [x] Current system name visible above "320 x 200, 16 colors" info
- [x] Updates when user selects different system

---

##### Story S5: Remove Duplicate Tabbed Selector ✓
- [x] Remove the system-tabs-container from above rendered image
- [x] Remove associated HTML
- [x] Remove associated CSS
- [x] Clean up unused JavaScript functions

**Acceptance Criteria:**
- [x] No system selector above rendered image
- [x] All system selection happens through sidebar drawer
- [x] No orphaned code remains

---

##### Story S6: Update Keyboard Navigation ✓
- [x] Up/Down arrows navigate systems in sidebar
- [x] Left/Right arrows navigate dither methods
- [x] Search input filters visible systems

**Acceptance Criteria:**
- [x] Keyboard navigation works within drawer
- [x] Can navigate without mouse

---

#### Implementation Order
1. Story S4 - Display current system name (independent change) ✓
2. Story S1 - Add tabs to sidebar ✓
3. Story S2 - Populate Defaults tab ✓
4. Story S3 - Populate Extended tab ✓
5. Story S5 - Remove duplicate selector ✓
6. Story S6 - Update keyboard navigation ✓

---

#### Bug Fixes / Refinements

##### Story S7: Fix Defaults Tab Content ✓
- [x] Defaults tab should only show systems from the "defaults" category
- [x] Currently showing all categories (defaults + expanded + defunct) incorrectly
- [x] Extended tab should contain expanded + defunct systems

**Acceptance Criteria:**
- [x] Defaults tab shows only curated default systems
- [x] Extended tab shows expanded and defunct systems
- [x] No overlap between tabs

---

##### Story S8: Fix Sub-System Expansion Position ✓
- [x] When expanding a system group, sub-systems should appear directly below the parent button
- [x] Currently sub-systems appear at the bottom of the list
- [x] Sub-systems should be visually indented or grouped with parent

**Acceptance Criteria:**
- [x] Clicking a system with sub-systems expands them inline below the button
- [x] Sub-systems visually connected to their parent
- [x] Collapsing hides the inline sub-systems

---

##### Story S9: Fix Keyboard Navigation Order ✓
- [x] Up/Down arrows should cycle through systems in the visible list order
- [x] Navigation should follow the current tab's list sequentially
- [x] Should wrap around at top/bottom of list

**Acceptance Criteria:**
- [x] Arrow keys navigate in visual order (top to bottom)
- [x] Navigation respects active tab
- [x] Wraps from last to first and vice versa

---

### Rendered Image Info & Palette Repositioning ✓

**Goal:** Improve the layout by moving system info and palette to the right side of the rendered image, and streamline the color picker interaction.

**Target Layout:**
```
┌─────────────────────────────────────────────┐
│   ┌─────────────────────────┐  System Name  │
│   │                         │  320 x 200    │
│   │    Rendered Image       │  16 colors    │
│   │                         │               │
│   └─────────────────────────┘  [Lock]       │
│                                 ■           │
│                                 ■           │
│                                 ■ (vertical)│
│                                 ■           │
└─────────────────────────────────────────────┘
```

#### Stories

##### Story R1: Relocate System Info to Right Side ✓
- [x] Move system name display to the right of the rendered canvas
- [x] Move format info (dimensions, colors) below the system name
- [x] Stack vertically on the right side
- [x] Ensure responsive behavior on mobile (may stack below on small screens)

**Acceptance Criteria:**
- [x] System name appears to the right of the canvas
- [x] Dimensions and color info below the name
- [x] Layout remains usable on mobile

---

##### Story R2: Relocate Palette to Right Side (Vertical Orientation) ✓
- [x] Move palette swatches to the right side, below the system info
- [x] Change palette orientation from horizontal to vertical
- [x] Move Lock/Reset buttons above or beside the vertical palette
- [x] Ensure swatches are still clickable for color picker

**Acceptance Criteria:**
- [x] Palette displays vertically on the right side
- [x] Lock/Reset buttons positioned appropriately
- [x] Color picker still functional

---

##### Story R3: Streamline Color Picker UX ✓
- [x] Clicking a palette swatch opens the color picker (current behavior)
- [x] Changing color in picker auto-applies immediately (live preview)
- [x] Clicking the same swatch again closes the picker
- [x] Remove the "Apply" button (no longer needed)
- [x] Clicking outside the picker or another swatch closes current picker

**Acceptance Criteria:**
- [x] Color changes apply immediately as user adjusts picker
- [x] No Apply button needed
- [x] Clicking swatch toggles picker open/closed
- [x] Smooth UX for quick color adjustments

---

### Keyboard Navigation Improvements ✓

**Goal:** Enhance sidebar keyboard navigation with expand/collapse support and sequential traversal through expanded sub-systems.

#### Stories

##### Story K1: Add Left/Right Keys for Expand/Collapse ✓
- [x] Right arrow expands a system group (if it has sub-systems)
- [x] Left arrow collapses an expanded system group
- [x] If already collapsed, Left arrow does nothing (or moves to parent)
- [x] Visual feedback when expanding/collapsing

**Acceptance Criteria:**
- [x] Right arrow on a group button expands its sub-systems
- [x] Left arrow collapses the expanded group
- [x] Works in conjunction with click behavior

---

##### Story K2: Sequential Navigation Through Expanded Sub-Systems ✓
- [x] Up/Down arrows cycle through entire visible list including expanded sub-systems
- [x] When a group is expanded, Down arrow enters the sub-system list
- [x] Continue through sub-systems before moving to next main system
- [x] Up arrow reverses this order (exit sub-systems back to parent)
- [x] Wrap around at top/bottom of entire list

**Acceptance Criteria:**
- [x] Navigation flows: System A → (expand) → SubA1 → SubA2 → SubA3 → System B
- [x] Up arrow reverses: System B → SubA3 → SubA2 → SubA1 → System A
- [x] Seamless keyboard-only navigation

---

### System Configuration Updates ✓

**Goal:** Update system defaults and configurations.

#### Stories

##### Story C1: Change NES Default Sub-System ✓
- [x] Change NES group default from current to "4 color, full screen" variant
- [x] Update `system-categories.ts` to set `nes4f` as the primary systemId
- [x] Move previous default (`nes5f`) to sub-systems list

**Acceptance Criteria:**
- [x] NES button selects 4-color full screen variant by default
- [x] Other NES variants still accessible via expansion
- [x] No regression in NES system functionality

---

### Image Display & Layout Refinements ✓

**Goal:** Improve image rendering to maintain proper aspect ratios and reorganize the info panel layout for better usability.

**Target Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Source Image    │  Rendered Image   │  Diversity: ═══  [Reset] System Name │
│  (aspect ratio   │  (max-height or   │  Ordered:   ═══  [Diff]  320 x 200   │
│   preserved)     │   max-width fit)  │  Noise:     ═══         16 colors    │
│                  │                   │  Diffusion: ═══                      │
│                  │                   ├──────────────────────────────────────│
│                  │                   │  [Lock] ■ ■ ■ ■ ■ ■ ■ ■ (palette)   │
│                  │                   │         ■ ■ ■ ■ ■ ■ ■ ■             │
└──────────────────┴───────────────────┴──────────────────────────────────────┘
```

#### Stories

##### Story L1: Preserve Source Image Aspect Ratio ✓
- [x] Ensure source image displays without stretching or skewing
- [x] Maintain original aspect ratio when fitting within container
- [x] Handle both landscape and portrait source images correctly

**Acceptance Criteria:**
- [x] Source image never appears distorted
- [x] Aspect ratio preserved regardless of container size
- [x] Works with any source image dimensions

---

##### Story L2: Rendered Image Max-Height/Max-Width Fitting ✓
- [x] Rendered image should fit to max-height OR max-width based on aspect ratio
- [x] Wider images fit to max-width, taller images fit to max-height
- [x] Image should fill available space without overflow
- [x] Maintain aspect ratio set by JavaScript

**Acceptance Criteria:**
- [x] Rendered image fills container appropriately
- [x] No scrolling needed to see full rendered image
- [x] Aspect ratio always preserved

---

##### Story L3: Expand Palette Area Height ✓
- [x] Increase height of palette display area
- [x] Eliminate need for scrolling in palette swatches
- [x] Ensure all palette colors visible without scrolling
- [x] Handle systems with large palettes (up to 64 colors)

**Acceptance Criteria:**
- [x] Palette swatches display without scrollbar
- [x] All colors visible at once
- [x] Works for systems with varying palette sizes

---

##### Story L4: Relocate System Info to Dither Panel ✓
- [x] Move system name to the right of dither sliders
- [x] Move sizing info (dimensions) next to system name
- [x] Move color info next to sizing info
- [x] Keep palette separate (remains in current location)

**Acceptance Criteria:**
- [x] System name, dimensions, and color info appear beside dither sliders
- [x] Clear visual grouping of related information
- [x] Palette remains in dedicated area

---

##### Story L5: Position Reset and Diffusion Buttons ✓
- [x] Place Reset button between sliders and system info
- [x] Place Diffusion method button between sliders and system info
- [x] Buttons should be vertically aligned with slider rows
- [x] Maintain compact layout

**Acceptance Criteria:**
- [x] Reset and Diffusion buttons clearly positioned
- [x] Buttons accessible without disrupting slider interaction
- [x] Clean visual separation between controls and info

---

### UI Polish & Bug Fixes

**Goal:** Fix visual inconsistencies, improve color picker UX, and refine keyboard navigation behavior.

#### Stories

##### Story P1: Vertical Palette Layout ✓
- [x] Change palette swatches from horizontal/grid to vertical stack
- [x] Swatches should display in a single column
- [x] Ensure adequate spacing between swatches
- [x] Handle long palettes with scrolling if needed

**Acceptance Criteria:**
- [x] Palette displays as vertical column
- [x] Consistent swatch sizing
- [x] Scrollable for large palettes

---

##### Story P2: Fix System Selector Keyboard Navigation ✓
- [x] Up/Down arrows cycle through system groups AND subsystems one-by-one
- [x] When navigating to a group with subsystems, highlight the group first
- [x] Down arrow on a group should enter its subsystems (if expanded)
- [x] Left arrow collapses expanded group, Right arrow expands group
- [x] Yellow highlight/selection should follow navigation correctly
- [x] Highlight should be visible on both groups and subsystems

**Acceptance Criteria:**
- [x] Arrow keys move highlight through all visible items sequentially
- [x] Left/Right expand/collapse groups
- [x] Visual highlight always visible and follows selection
- [x] Selecting a system (Enter or click) applies it

---

##### Story P3: Fix Rendered Image Aspect Ratio Stretching ✓
- [x] Some systems (e.g., BBC Micro) have incorrect aspect ratio display
- [x] Rendered image should not stretch to fill height incorrectly
- [x] Maintain proper aspect ratio based on system's scaleX setting
- [x] Canvas should fit within container without distortion

**Acceptance Criteria:**
- [x] BBC Micro and similar systems render at correct aspect ratio
- [x] No vertical or horizontal stretching
- [x] Image fits within container bounds

---

##### Story P4: Simplify Color Picker Interaction ✓
- [x] Clicking a palette swatch should open the native color picker directly
- [x] Remove intermediate popup/panel with duplicate swatch
- [x] Color picker input should open immediately on swatch click
- [x] Changes still auto-apply as color is adjusted

**Acceptance Criteria:**
- [x] Single click opens browser's native color picker
- [x] No intermediate UI elements
- [x] Live preview still works as color changes

---

##### Story P5: Align Dither Slider Styling with Source Sliders ✓
- [x] Match spacing/padding of Diversity/Ordered/Noise/Diffusion sliders
- [x] Use same layout as Bright/Contrast/Color sliders
- [x] Consistent label widths and slider track alignment
- [x] Uniform visual appearance across both slider panels

**Acceptance Criteria:**
- [x] Dither sliders visually match source sliders
- [x] Consistent padding and margins
- [x] Labels aligned identically

---

## Completed

### System Selector Refactoring
- [x] Create system categories data structure (`SYSTEM_CATEGORIES.md`, `system-categories.ts`)
- [x] Build tabbed system selector with 3 tabs (Defaults/Expanded/Non-Standard)
- [x] Implement horizontal system buttons with flexbox layout
- [x] Add sub-system expansion with dropdown arrows
- [x] Keyboard navigation (Left/Right for tabs, Up/Down for sidebar)
- [x] Make sidebar collapsible on desktop (with localStorage persistence)
- [x] Synchronize tabbed selector and sidebar
- [x] Mobile responsive behavior

### Color Picker for Palette Swatches
- [x] Make swatches clickable with color picker
- [x] Create mutable palette in UI layer
- [x] Trigger re-dither on color change
- [x] Add reset palette button
- [x] Handle edge cases (systems with palette reduction)

### UI Cleanup
- [x] Remove "Download BIN" button
- [x] Remove "Open in 8bitworkshop" button
- [x] Move README and Books buttons to page footer
- [x] Update header from "DITHERTRON" to "DITHERTRON 2.0"
- [x] Remove background color from page

### Additional Features
- [x] Add "Copy Image" button
