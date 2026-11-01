# IXL Team Hours Tracker Web App

A modern, fast, zero-dependency web application to track team project allocations, replacing the Excel tracking sheet with automated hours calculation, conditional formatting for missing days, multi-office scheduling, and admin controls.

---

## 🚀 How to Launch the Web App

1. **Double-click `Start-App.bat`** in this folder.
2. The server will start, and your web browser will automatically open:
   * **Edit Mode:** [http://localhost:8080/](http://localhost:8080/)
   * **View-Only Mode:** [http://localhost:8080/?mode=view](http://localhost:8080/?mode=view)

*(Note: If port 8080 is in use, the server automatically falls back to 8081).*

---

## 🔑 Admin Security
* **Default Admin PIN:** `1234`
* To unlock admin actions (adding new members, changing custom hours, moving members across sections, deleting projects, or removing members), click **"🔒 Admin Unlock"** in the top navigation bar.

---

## ✨ Features Implemented

1. **Self-Contained in Your Working Folder:**
   * All files reside in `C:\Users\511878\Desktop\Working\Hours APP`.
   * Zero external software needed (no Node.js or Python installations required). Runs directly on native Windows PowerShell.

2. **Add / Remove Projects:**
   * Click **"📁 Projects"** in the top bar to add new projects, tenders, or training items with WBS codes and categories, or delete existing ones.

3. **Add New Members:**
   * Click **"👥 Team"** &rarr; **"+ Add Member"** to introduce new members to any team/section with custom default daily hours.

4. **Member Removal Controls (Admin Protected):**
   * **Choice 1 (Default): Deactivate Member** — Hides the employee from the active schedule grid for future entries, while *safely preserving all their past recorded hours* in monthly reports and analytics.
   * **Choice 2: Permanently Purge Member** — Deletes the member and completely removes all their recorded hours from the system.

5. **Live Connection Indicator (Sync Lamp):**
   * 🟢 **Green Pulsing Lamp:** Connected and synchronized in real-time with the local server.
   * 🔴 **Red Pulsing Lamp:** Offline or connection interrupted; alerts users if server is stopped.

6. **View-Only Sharing Link:**
   * Click **"🔗 View-Only Link"** in the top bar to copy `http://localhost:8080/?mode=view`.
   * Anyone opening this link can inspect schedules and reports without the ability to edit or modify data.

7. **Move Employees Between Sections:**
   * In **"👥 Team"**, simply change the dropdown section next to any employee (e.g. Istanbul &rarr; Cairo or Application &rarr; ILS). The schedule grid automatically regroups them.

8. **Configurable Daily Hours per Employee:**
   * Each employee can have their own custom hours per day (e.g. 8h, 7.5h, 9h).
   * All total hour calculations and monthly over/under variances dynamically use each employee's custom rate.

9. **Conditional Formatting for Unfilled Days:**
   * Any working day from the start of the year up to **Today** that is missing an assignment is highlighted with an amber/red warning cell and a `⚠️` badge.
