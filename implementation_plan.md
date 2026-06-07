# The 0.1% Sales OS — "God Mode" Manager Upgrade

This plan outlines the architectural and UI upgrades required to transition the Sales Command OS from a high-functioning execution tool into a top 0.1% predictive intelligence platform. In top-tier organizations (like Bridgewater or high-frequency trading floors), managers don't just "look at data"—they operate a machine. The OS must shift from **descriptive** (what happened) to **predictive** (what will happen) and **prescriptive** (what to do right now).

## The 0.1% Philosophy
- **Managers are Conductors:** A manager's dashboard is not a list of leads; it is an aggregate of squad health. If a rep's performance drops, the OS automatically identifies the root cause (e.g., "SLA response time increased by 4 hours").
- **Dynamic Physics:** Targets aren't static numbers. They are sliders. If a manager increases a monthly target, the OS instantly recalculates the required daily pipeline velocity for the team.
- **Algorithmic Routing:** Leads are not assigned randomly. The OS routes high-value leads to reps who are currently on a "hot streak" or have historically high win rates for that specific lead source.

## Proposed Upgrades

### Phase 1: Team Architecture & Dynamic Targets
To give managers true control, we must overhaul the underlying data structure to support hierarchies and dynamic goals.

#### [MODIFY] `schema.sql`
- **Add Team Hierarchy:** Add `manager_id` to the `users` table so reps can be explicitly linked to specific managers.
- **Add `monthly_targets` Table:** Create a new table to track individual and team quotas (Revenue, Conversion Rate, Calls/day) broken down by month/quarter.

#### [MODIFY] `ManagerDashboard.jsx` & [NEW] `TeamCommandPanel.jsx`
- **Interactive Quota Sliders:** A new UI panel where managers can drag sliders to adjust a rep's monthly target, instantly updating the rep's personal dashboard.
- **Rollup Metrics:** The manager's primary view will aggregate the pipeline of all their assigned reps. If a manager has a $5M target, they see exactly how much pipeline coverage they have across the squad.
- **Roster Management:** Drag-and-drop interface to reassign reps or instantly bulk-transfer leads from a struggling rep to a high-performing one.

### Phase 2: Advanced Physics (The Metrics that Matter)
We will introduce the tracking metrics used by elite revenue teams.

#### [NEW] `PipelinePhysics.js` (Engine)
- **Pipeline Velocity ($/day):** Measures how fast money is moving through the pipeline. `(Number of Opportunities × Deal Value × Win Rate) / Sales Cycle Length`.
- **SLA Tracking (Time-to-Touch):** Measures the exact time between lead creation and first follow-up.
- **Conversion Cohorts:** Visualizing not just *if* leads close, but *when* they close relative to their creation date.

#### [MODIFY] `AnalyticsDashboard.jsx`
- Add a **Velocity Matrix**: A heat map showing which reps are moving deals the fastest.
- Add **SLA Violations**: A live ticker showing leads that have sat untouched for > 15 minutes.

### Phase 3: "Real Intelligence" (Predictive & Prescriptive)
Moving beyond basic math into actual autonomous intelligence.

#### [NEW] `PredictiveEngine.js`
- **Algorithmic Forecasting:** Instead of simple weighted pipelines, the engine analyzes a rep's historical win rate *for that specific lead source* to generate a "Confidence Score" for closing the month.
- **Automated Coaching Prompts:** The system analyzes behavioral data and generates prompts for the manager. Example: *"Anshu's win rate on Facebook leads dropped 12% this week. Root cause: Follow-up time increased to 4 hours. Recommend coaching session."*

#### [MODIFY] `FocusMode.jsx`
- **Smart Lead Routing (The "Hot Hand" algorithm):** When new high-value leads enter the system, they bypass round-robin assignment and are instantly routed to the rep currently maintaining the highest daily velocity score.

## Verification Plan
### Automated Tests
- Database tests to ensure hierarchical data fetching accurately rolls up pipeline values to the assigned manager without double-counting.
- Algorithm tests for `PipelinePhysics` to verify velocity math.

### User Review Required
> [!IMPORTANT]  
> Are we structuring this so there is ONE master Admin, multiple Managers, and multiple Reps under each Manager? Or is it a flat structure where all Managers see all Reps?
> 
> Also, do you want targets set strictly by **Revenue ($)**, or do we need compound targets (e.g., Revenue + Conversion Rate minimums)?
