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

### Story 1: Restructure HTML for Flexbox Layout
**Description:** Reorganize HTML structure to support proper flexbox-based vertical layout
**Tasks:**
- Wrap each column (left/right) in a flex container that spans from top UI to bottom sliders
- Create dedicated image container divs with proper flex properties
- Ensure the image containers can calculate available height

**Acceptance Criteria:**
- [ ] Each side has a vertical flex container
- [ ] Image areas are in dedicated containers
- [ ] Structure supports dynamic height calculation

---

### Story 2: Calculate Available Image Area Height
**Description:** Dynamically size the image area based on viewport minus fixed elements
**Tasks:**
- Calculate: viewport height - header - top UI - bottom sliders - footer - padding
- Apply this height to the image container area
- Handle window resize events

**Acceptance Criteria:**
- [ ] Image area height adjusts to viewport
- [ ] Resizing window recalculates layout
- [ ] No overflow or scrolling within main content

---

### Story 3: Align Source Image (Cropper) Column
**Description:** Make the source image/cropper fill its column width and center vertically
**Tasks:**
- Remove any hardcoded widths from cropper container
- Set cropper to fill available width in its column
- Vertically center the cropper in its flex container
- Ensure cropper respects the calculated height

**Acceptance Criteria:**
- [ ] Source image aligns with blue UI panel edges above
- [ ] Source image aligns with gray slider panel edges below
- [ ] Cropper is vertically centered when smaller than available space

---

### Story 4: Align Rendered Image (Canvas) Column
**Description:** Make the rendered canvas fill its column width while maintaining aspect ratio
**Tasks:**
- Remove `width: 85%` from `.emuvideo` class
- Set canvas to fill available width (with max-width constraint)
- Maintain aspect ratio using CSS or JS
- Include palette swatches in the centered content
- Vertically center canvas + swatches as a unit

**Acceptance Criteria:**
- [ ] Rendered image aligns with blue UI panel edges above
- [ ] Rendered image aligns with gray slider panel edges below
- [ ] Canvas maintains correct aspect ratio
- [ ] Palette swatches stay with the canvas
- [ ] Content is vertically centered

---

### Story 5: Add Consistent Gutter Between Columns
**Description:** Create a clean white gap between source and rendered image areas
**Tasks:**
- Add consistent padding/gap between the two columns
- Ensure gutter is visible (white space)
- Gutter should run from top UI to bottom sliders

**Acceptance Criteria:**
- [ ] Visible white gutter between image areas
- [ ] Gutter width is consistent (e.g., 1rem or 16px)
- [ ] Gutter extends full height of image area

---

### Story 6: Handle Responsive/Mobile Layout
**Description:** Ensure the layout works on smaller screens
**Tasks:**
- Stack columns vertically on mobile
- Adjust image sizing for single-column layout
- Test on various viewport sizes

**Acceptance Criteria:**
- [ ] Layout stacks properly on mobile
- [ ] Images remain properly sized on small screens
- [ ] No horizontal scrolling on mobile

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
