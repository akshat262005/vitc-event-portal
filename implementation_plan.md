# Implementation Plan - Admin OD Verification Workflow & Redesign

Replace the deprecated "Time Slot" logic with a robust, multi-version academic On-Duty verification workflow. The Admin can verify student lists as fully or partially updated, logging remarks and completed/remaining student metrics. The Chairperson can track the status, view detailed remarks, and resubmit revised lists.

## User Review Required

> [!IMPORTANT]
> - **Database migrations**: We will add default values for new fields (`verificationStatus` defaults to `pending`, `resubmissionCount` to `0`, and `currentVersion` to `1`).
> - **Excel Import/Export**: The excel generator will reflect the new schema status fields instead of Time Slot.
> - **Deletion**: Deleting reports or OD lists will clean up version history as well.

## Proposed Changes

### Database Layer

#### [MODIFY] [db.js](file:///c:/Users/aksha/Documents/swc_project/backend/db.js)
- Modify `ODListSchema` to:
  * Remove or make `timeSlot` optional.
  * Add `verificationStatus` string field (enum: `'pending'`, `'fully_updated'`, `'partially_updated'`, default: `'pending'`).
  * Add `totalStudents` (Number).
  * Add `completedStudents` (Number, default: `0`).
  * Add `remainingStudents` (Number, default: `0`).
  * Add `adminRemarks` (String, default: `''`).
  * Add `verifiedBy` (ObjectId, ref: `'User'`).
  * Add `verifiedAt` (Date).
  * Add `resubmissionCount` (Number, default: `0`).
  * Add `currentVersion` (Number, default: `1`).
  * Add `versions` array containing schemas for:
    - `version` (Number)
    - `students` (Array of Student objects)
    - `uploadedAt` (Date)

---

### Backend API Layer

#### [MODIFY] [odRoutes.js](file:///c:/Users/aksha/Documents/swc_project/backend/routes/odRoutes.js)
- Modify `POST /` (new OD creation):
  * Set `totalStudents = students.length`, `remainingStudents = students.length`.
  * Set default values: `verificationStatus = 'pending'`, `currentVersion = 1`.
  * Push initial students list to the `versions` array: `[{ version: 1, students }]`.
- Add `PUT /:id/verify` (Admin only):
  * Set status to `fully_updated` or `partially_updated`.
  * If `fully_updated`, set `completedStudents = totalStudents`, `remainingStudents = 0`, clear remarks.
  * If `partially_updated`, validate `completedStudents <= totalStudents`, set `remainingStudents = totalStudents - completedStudents`, save `adminRemarks`.
  * Create notifications for the club's Chairperson.
- Add `PUT /:id/resubmit` (Chairperson only):
  * Increments `resubmissionCount` and `currentVersion`.
  * Sets `totalStudents = newStudents.length`, `remainingStudents = newStudents.length`, `completedStudents = 0`.
  * Resets `verificationStatus = 'pending'`.
  * Pushes the new list to `versions` array and replaces the main `students` list.

---

### Frontend Components

#### [MODIFY] [Admin/Dashboard.jsx](file:///c:/Users/aksha/Documents/swc_project/frontend/src/components/Admin/Dashboard.jsx)
- Replace Time Slot stats cards with the **OD Verification Summary**:
  * Pending Verification (Count)
  * Fully Updated (Count)
  * Partially Updated (Count)
  * Total Students Completed (Sum of completed)
  * Total Students Remaining (Sum of remaining)

#### [MODIFY] [Admin/ODLists.jsx](file:///c:/Users/aksha/Documents/swc_project/frontend/src/components/Admin/ODLists.jsx)
- Remove Time Slot headers, filtering dropdowns, and badges.
  * Add status filters (All, Pending, Fully Updated, Partially Updated).
  * Render progress bar indicator `(Completed / Total)` for each row.
  * In the expanded detailed panel, replace the simple remarks textbox with the **OD Verification Form**:
    - Dropdown: **Verification Status** (`Pending Verification`, `Fully Updated`, `Partially Updated`).
    - Numeric input for **Completed Students** and a text area for **Remarks** (visible if `Partially Updated` is selected).
    - Save action button calling `PUT /api/ods/:id/verify`.
    - Render the calculated remaining count and list of previous versions.

#### [MODIFY] [Chairperson/Dashboard.jsx](file:///c:/Users/aksha/Documents/swc_project/frontend/src/components/Chairperson/Dashboard.jsx)
- Replace the Time Slot table column with a **Status & Progress Column**:
  * Render Status Badges:
    - 🟡 `Pending Verification`
    - 🟢 `Fully Updated`
    - 🟠 `Partially Updated` (with Completed/Remaining count + Progress bar).
  * Render detailed admin remarks log below the status.
  * If `Partially Updated`, display a **"Resubmit Corrected OD"** action button. This button redirects to the upload/edit OD screen.

#### [MODIFY] [Chairperson/UploadODForm.jsx](file:///c:/Users/aksha/Documents/swc_project/frontend/src/components/Chairperson/UploadODForm.jsx)
- Remove `timeSlot` selections and backend payloads.
- If in edit mode and the status is `partially_updated`, the submit button is labeled `"Resubmit Corrected OD"`, and calls the `PUT /api/ods/:id/resubmit` endpoint.

---

## Verification Plan

### Automated Tests
- Trigger verification status updates via mock requests.
- Verify `remainingStudents` calculations and validator limits.

### Manual Verification
- Log in as Chairperson, submit report and OD.
- Log in as Admin, verify the OD as "Partially Updated" (Completed: 90 / Total: 120), write remarks.
- Log back in as Chairperson, verify that dashboard displays the progress bar (75%) and remarks drawer. Click "Resubmit", upload a corrected spreadsheet, and verify that the status reverts to "Pending Verification".
