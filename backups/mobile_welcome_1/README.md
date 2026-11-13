# Design Preset: mobile_welcome_1

This directory holds the exact snapshot and restoration assets for the Mobile Welcome Screen preset named **mobile_welcome_1**.

## Quick Restoration
If you ever change the mobile welcome screen design and wish to restore this exact design, tell the assistant:
> *"plz get back to mobile_welcome_1"*

Or run the automated PowerShell script:
```powershell
.\backups\mobile_welcome_1\restore_mobile_welcome_1.ps1
```

Or restore via Git:
```powershell
git checkout mobile_welcome_1 -- public/index.html public/styles.css
```

---

## Technical Specifications

### 1. ALSTOM Brand Logo (Mobile Portrait)
* 100% Vector SVG official wordmark (`viewBox="20 18 292 52"`).
* Pure white letters A, L, S, T, M (`#FFFFFF`).
* Official ALSTOM red aperture swirl on letter O (`#E01A22`).
* Responsive width: `clamp(210px, 68vw, 290px)`.

### 2. Aerodynamic Bullet Train Loader (Mobile Portrait)
* Shifted horizontally to the right by **3 mm** (`transform: translateX(3mm) !important;`).
* Extended tail begins at `x = 8` (under letter **A**).
* Train head tip terminates at `x = 508` (under letter **M**).
* Active glowing headlight at `cx = 506`, `cy = 23`.
* Trailing neon cyan streaks (`#38bdf8`) with linear gradient fading into white at nose tip.
* Fluid animated progress stroke duration: strictly **5.0 seconds** (`5s cubic-bezier(0.2, 0.85, 0.25, 1)`).
* Strict 5-second lockout on Mobile.

### 3. Signature Cluster Typography (Mobile)
* **"by"**:
  * Upright sans-serif (`font-style: normal`, `font-weight: 400`).
  * Font size: `clamp(13px, 3.5vw, 15px)`.
  * Color: muted dark slate gray `#64748b` with `opacity: 0.65`.
  * Spacing: `margin-bottom: 8px` (increased breathing room).
* **"IXL Team"**:
  * Upright clean sans-serif (`font-style: normal`, system sans-serif font stack).
  * Weight: Semi-Bold (`font-weight: 600`).
  * Font size: `clamp(18px, 5vw, 22px)` (refined compact scale).
  * Color: Soft off-white `#e2e8f0` at `opacity: 0.9` (eliminates glaring harshness while remaining distinctly white).
  * Subtle depth: `text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35)`.
  * Spacing: `margin-bottom: 10px`.
* **"1.0.0"**:
  * Upright sans-serif (`font-style: normal`, `font-weight: 400`).
  * Font size: `clamp(12px, 3vw, 13px)`.
  * Color: muted dark slate gray `#475569` with `opacity: 0.65`.
  * Letter spacing: `0.08em`.

---

## Files in this Preset
* **[preview.html](file:///C:/Users/511878/Desktop/Working/Hours%20APP/backups/mobile_welcome_1/preview.html)**: Standalone live preview of the complete mobile welcome screen in portrait format.
* **[mobile_welcome_1.manifest.json](file:///C:/Users/511878/Desktop/Working/Hours%20APP/backups/mobile_welcome_1/mobile_welcome_1.manifest.json)**: Machine-readable specifications.
* **[restore_mobile_welcome_1.ps1](file:///C:/Users/511878/Desktop/Working/Hours%20APP/backups/mobile_welcome_1/restore_mobile_welcome_1.ps1)**: 1-click restore script.
