# Welcome Screen Backup Presets Policy

> **CRITICAL DIRECTIVE**:
> `pc_welcome_1` and `mobile_welcome_1` are frozen, permanent backup restore points.
> Whenever updating, tweaking, or experimenting with the welcome screen on any interface (PC or Mobile):
> 1. **DO NOT MODIFY** any files inside `backups/pc_welcome_1/` or `backups/mobile_welcome_1/`.
> 2. All experiments and updates must be applied directly to active application files (`public/styles.css`, `public/index.html`, `public/app.js`).
> 3. These backup directories exist so that if any new design experiment is not desired, the exact golden designs can be instantly and losslessly restored.
> 4. Only create new versioned backups (e.g., `pc_welcome_2`, `mobile_welcome_2`) or modify existing ones when explicitly instructed by the user.

## Available Golden Presets

### 1. `pc_welcome_1`
- **Location**: [backups/pc_welcome_1/](file:///C:/Users/511878/Desktop/Working/Hours%20APP/backups/pc_welcome_1/)
- **Git Tag**: `pc_welcome_1`
- **Restore Command**: `powershell -ExecutionPolicy Bypass -File backups/pc_welcome_1/restore_pc_welcome_1.ps1`
- **Specs**:
  - Horizontal train loader offset: `translateX(5mm)`
  - Subtitle: "by IXL Team" soft white `#e2e8f0` (0.9 opacity), upright sans-serif Semi-Bold 600
  - Pure code CSS/SVG implementation (zero static images)

### 2. `mobile_welcome_1`
- **Location**: [backups/mobile_welcome_1/](file:///C:/Users/511878/Desktop/Working/Hours%20APP/backups/mobile_welcome_1/)
- **Git Tag**: `mobile_welcome_1`
- **Restore Command**: `powershell -ExecutionPolicy Bypass -File backups/mobile_welcome_1/restore_mobile_welcome_1.ps1`
- **Specs**:
  - Horizontal train loader offset: `translateX(3mm)`
  - Subtitle: "by IXL Team" soft white `#e2e8f0` (0.9 opacity), upright sans-serif Semi-Bold 600, `margin-bottom: 8px` on "by", `margin-bottom: 10px` on "IXL Team"
  - Pure code CSS/SVG implementation (zero static images)
