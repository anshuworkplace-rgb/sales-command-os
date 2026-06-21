# ⚡ Sales Command OS — The 0.1% Revenue Intelligence Engine

Sales Command OS is a high-performance, real-time lead management and revenue forecasting platform. Built for elite sales teams and revenue managers, the platform shifts from descriptive data tracking to predictive coaching and automated routing.

---

## 🚀 Key Capabilities

### 1. Advanced Team & Target Command
* **Manager Rollup Dashboards:** Managers get a unified team pipeline view, tracking aggregate squad health, pipeline velocity, and conversion cohorts.
* **Interactive Quota Sliders:** Set dynamic targets (Revenue, Conversion Rate, Calls/day) that adjust and distribute quotas in real-time.
* **Hot Streak Lead Routing:** Automatically identify high-velocity reps and route incoming high-value leads to the rep on a "hot hand."

### 2. Pipeline Physics & SLA Tickers
* **Pipeline Velocity Engine:** Track pipeline velocity in real-time using `(Opportunities × Deal Value × Win Rate) / Sales Cycle Length`.
* **SLA Violations Ticker:** A live dashboard feed highlighting any fresh lead untouched for more than 15 minutes.
* **Hinglish AI Battlecards:** AI-driven text analyzer parsing Hinglish/English notes to extract user profile details (capital, broker, trading experience) and surface dynamic sales battlecards.

### 3. Bi-Directional Google Sheets Sync
* **Enquiry Date Parsing:** Built-in row-wise date parser that group-syncs leads under header dates (e.g. `17-06-2026`) and assigns them as actual lead created/enquiry times in the OS.
* **Scan-Upward triggers:** Script editor automation scanning upwards to find the closest date separator on edits to single rows.
* **Opt-Lock Concurrency:** Optimistic currency control and conflict resolution if both Sheet and OS are modified concurrently.

---

## ⚙️ Technology Stack

* **Frontend:** React (Vite), Tailwind CSS, Framer Motion
* **State Management:** Zustand
* **Database & Auth:** Supabase (PostgreSQL) + Real-time subscriptions
* **Integration Layer:** Google Apps Script Web App API

---

## 📋 Google Sheets Sync Setup Guide

To sync leads from Google Sheets (using the default layout where date separators are declared in rows above every day's fresh leads):

### Step 1: Open Apps Script Editor
1. In your Google Sheet, navigate to **Extensions** → **Apps Script**.
2. Clear any existing code in the code editor window.

### Step 2: Copy & Paste the Custom Script
1. In the SalesOS dashboard, go to the **Sheets** configuration tab.
2. Click **Copy Script** to grab the pre-configured Apps Script template.
3. Paste the code into your Apps Script editor and click **Save (💾)**.

### Step 3: Renaming Sheet Tab
* Ensure the tab name at the bottom of your Google Sheet is exactly `web lead` (all lowercase, no trailing spaces).

### Step 4: Configure Triggers
To enable automatic synchronization whenever you modify a lead row:
1. Click the **⏰ Triggers** (alarm clock icon) in the left panel of the Apps Script dashboard.
2. Click **+ Add Trigger** in the bottom-right corner.
3. Set the following options:
   * **Choose which function to run:** `onEdit`
   * **Choose which deployment should run:** `Head`
   * **Select event source:** `From spreadsheet`
   * **Select event type:** `On edit`
4. Click **Save**.
5. When Google prompts you for permissions, click **Advanced** → **Go to SalesOS Sync (unsafe)** → **Allow**.

### Step 5: Initial Sync
1. Reload your Google Sheet.
2. You will see a **`⚡ SalesOS`** menu tab appear in the spreadsheet menu bar.
3. Click **`⚡ SalesOS`** → **`🔄 Sync All to SalesOS`** to perform the initial bulk synchronization.
