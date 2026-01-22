# Dithertron Backlog

## Epics

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
