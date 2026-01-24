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

##### Story D2: Update Cropper to Use Source Aspect Ratio
- [ ] Remove forced aspect ratio constraint from cropper initialization
- [ ] Allow free-form cropping within the source image
- [ ] Cropper still respects minimum dimensions based on system native size
- [ ] Update crop event handler to recalculate canvas dimensions on crop change

**Acceptance Criteria:**
- Cropper no longer forces system aspect ratio
- User can crop any region of source image
- Changing crop area triggers canvas dimension recalculation

---

##### Story D3: Modify Resize Canvas to Support Dynamic Dimensions
- [ ] Update `resizeCanvas` to use calculated dimensions instead of fixed system size
- [ ] Ensure resize canvas dimensions match the expanded target
- [ ] Update `convertImage()` to use dynamic dimensions
- [ ] Verify source image is properly scaled to fill expanded canvas

**Acceptance Criteria:**
- Resize canvas dimensions match calculated expanded size
- Source image fills entire canvas (no letterboxing)
- Image is not distorted (maintains source aspect ratio)

---

##### Story D4: Update Dithering to Work at Expanded Resolution
- [ ] Pass expanded dimensions to dithertron settings
- [ ] Verify dithering math works correctly at non-native resolutions
- [ ] Test block-based systems render correctly with expanded dimensions
- [ ] Ensure palette generation considers full expanded image

**Acceptance Criteria:**
- Dithering produces correct output at expanded resolutions
- Block constraints are maintained (no partial blocks at edges)
- Palette reduction considers entire expanded image

---

##### Story D5: Update Rendered Canvas Display
- [ ] Rendered canvas displays at expanded dimensions
- [ ] Canvas maintains correct aspect ratio in display
- [ ] Format info text shows expanded dimensions (e.g., "320 x 240" instead of "320 x 200")
- [ ] PNG download exports at expanded resolution

**Acceptance Criteria:**
- Rendered image matches source aspect ratio visually
- PNG export is at full expanded resolution
- Format info accurately reflects expanded dimensions

---

##### Story D6: Remove Letterbox Mode
- [ ] Remove letterbox toggle button from UI
- [ ] Remove letterbox-related code from cropper initialization
- [ ] Remove letterbox state tracking
- [ ] Clean up any letterbox CSS/styles

**Acceptance Criteria:**
- Letterbox button no longer appears
- No letterbox-related code remains
- New aspect matching is the default (and only) behavior

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

##### Story D8: Comprehensive Testing Suite
- [ ] Add unit tests for dimension calculation function (Story D1)
- [ ] Add unit tests for block boundary rounding
- [ ] Add integration tests for cropper behavior (enabled/disabled states)
- [ ] Test all existing systems still produce valid output
- [ ] Test palette reduction works correctly at expanded resolutions
- [ ] Test PNG export at expanded dimensions
- [ ] Test slider adjustments (brightness, contrast, etc.) work at expanded size

**Acceptance Criteria:**
- All new dimension calculation logic has unit test coverage
- Existing dithering tests pass with aspect ratio changes
- No regressions in current functionality

---

##### Story D9: Handle Edge Cases and System Variations
- [ ] Test with systems that have extreme aspect ratios
- [ ] Test with systems that have large block sizes (STIC, VCS)
- [ ] Test with systems that have `scaleX` != 1 (non-square pixels)
- [ ] Test with very wide and very tall source images
- [ ] Add reasonable limits to prevent excessive canvas expansion
- [ ] Test crop toggle works correctly with all system types
- [ ] Test switching systems while crop is disabled/enabled

**Acceptance Criteria:**
- All system types produce valid output
- No crashes or rendering errors with extreme aspect ratios
- Canvas expansion has reasonable upper bounds
- Crop toggle works consistently across all systems

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
