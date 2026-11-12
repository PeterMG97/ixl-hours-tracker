# IXL Team Hours Tracker Web App

A modern, fast, zero-dependency web application to track team project allocations, replacing legacy tracking sheets with automated hours calculation, conditional formatting for missing days, multi-office scheduling (Cairo & Istanbul), and administrative controls.

---

## Project Structure

The project is organized into professional, categorized directories:

```
Hours APP/
|-- public/                   # Client web application and static assets
|   |-- index.html            # Single-page application entry point
|   |-- styles.css            # Stylesheets, themes, and responsive layout
|   |-- app.js                # Core client logic, state management, calculations
|   |-- data.json             # Seed and active database file
|   |-- favicon.ico           # Web icon (ICO format)
|   |-- favicon.svg           # Scalable vector web icon
|   |-- alstom-logo-light.png # Corporate light theme brand logo
|   |-- alstom-logo-dark.png  # Corporate dark theme brand logo
|   |-- alstom-welcome-pc.jpg # PC welcome screen fallback asset
|   `-- alstom-welcome-mobile.jpg # Mobile welcome screen fallback asset
|
|-- server/                   # Backend server implementations
|   |-- server.js             # Node.js Express API and static server
|   `-- server.ps1            # Native Windows PowerShell web server (zero-install)
|
|-- tests/                    # Automated testing and verification suites
|   |-- test_suite.ps1        # Comprehensive test runner (97 checks)
|   |-- test_calculation_integrity.ps1 # Double-entry accounting integrity suite (39 checks)
|   `-- test_*.js             # 21 dedicated Node.js component test suites
|
|-- docs/                     # Technical and architectural documentation
|   |-- TECHNICAL_ARCHITECTURE.md
|   |-- TECHNICAL_ARCHITECTURE.html
|   `-- TECHNICAL_ARCHITECTURE.pdf
|
|-- backups/                  # Historical backups and reference baseline assets
|   |-- backup_welcome_screen_image_approach.html
|   |-- data.backup.json
|   |-- welcome_pic/
|   `-- welcome_pic_mob/
|
|-- tools/                    # External binaries and developer utilities
|   `-- cloudflared.exe       # Cloudflare Tunnel binary for public sharing
|
|-- scripts/                  # Operational launch scripts
|   |-- Start-App.bat         # Start server and open browser
|   |-- Run-Tests.bat         # Run automated test suite
|   `-- Share-Public-Link.bat # Launch public Cloudflare tunnel
|
|-- Start-App.bat             # Desktop root shortcut to start app
|-- Run-Tests.bat             # Desktop root shortcut to run tests
|-- Share-Public-Link.bat     # Desktop root shortcut to launch public tunnel
|-- firebase.json             # Firebase Hosting deployment configuration
|-- .firebaserc               # Firebase project target configuration
|-- package.json              # Node.js project manifest and scripts
|-- .gitignore                # Git ignore rules
`-- README.md                 # Project documentation
```

---

## How to Launch the Web App

1. **Double-click `Start-App.bat`** in the project folder.
2. The server will start, and your web browser will automatically open:
   * **Edit Mode:** [http://localhost:8080/](http://localhost:8080/)
   * **View-Only Mode:** [http://localhost:8080/?mode=view](http://localhost:8080/?mode=view)

*(Note: If port 8080 is in use, the server automatically falls back to 8081).*

---

## How to Run Automated Tests

* Double-click **`Run-Tests.bat`** in the project folder, or run:
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File tests/test_suite.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File tests/test_calculation_integrity.ps1
  ```

---

## Public Cloud Link Sharing

* Double-click **`Share-Public-Link.bat`** while the server is running to create a secure, instant Cloudflare tunnel for external team members in Cairo and Istanbul.

---

## Admin Security

* Admin controls (adding/deleting members, custom rates, moving sections, modifying project master) are restricted to authorized administrators.
* Password recovery dispatches directly to the authorized administrator's official work email (`peter.mounir@alstomgroup.com`) with zero on-screen leakage.
