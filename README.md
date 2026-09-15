# Laboratory Asset and Service Management System
## Lab 4 - Role-Based Asset Transaction and Approval Management

This project extends the existing Laboratory Asset and Service Management System with
role-based access control, a borrowing-request approval workflow, business-rule
enforcement, and an audit trail, built with **GitHub + GitHub Pages + Supabase**.

---

## 1. What's in this project

```
lab4-app/
├── index.html          Login / sign-up page
├── dashboard.html       Main app shell (role-based navigation)
├── css/style.css        Styling
├── js/
│   ├── supabaseClient.js   Supabase connection settings
│   ├── auth.js             Login / sign-up logic
│   └── app.js              Equipment, requests, approvals, users, audit log
└── sql/schema.sql       Tables, Row Level Security, and business-rule triggers
```

---

## 2. Setup

### Step 1 - Create a Supabase project
1. Go to https://supabase.com and create a new project.
2. Open **SQL Editor** and run the full contents of `sql/schema.sql`. This creates:
   - `profiles`, `equipment`, `borrowing_requests`, `audit_logs` tables
   - Row Level Security (RLS) policies for each role
   - Triggers that enforce the business rules (BR-A4-01 to BR-A4-09) at the database level
3. Open **Project Settings > API** and copy your **Project URL** and **anon public key**.

### Step 2 - Connect the app to Supabase
Open `js/supabaseClient.js` and replace the placeholders:
```js
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

### Step 3 - Create your first Administrator
1. Run the app (see below) and use **Sign up** to create an account. New accounts
   are created with the **Requester / Viewer** role by default.
2. In Supabase, open **Table Editor > profiles**, find your new user, and change
   `role` to `admin`.
3. Log back in - you will now see the Administrator navigation (Manage Users, Audit Log).
   From the **Manage Users** page you can now change any other account's role from
   the interface instead of editing the table directly.

### Step 4 - Run locally
Because the app uses ES modules, open it through a local server rather than a
`file://` path, for example:
```
npx serve .
```
Then visit the printed local URL.

### Step 5 - Deploy to GitHub Pages
1. Push this project to a GitHub repository.
2. In the repository, go to **Settings > Pages**.
3. Set the source branch to `main` (or `master`) and the folder to `/ (root)`.
4. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/`.

---

## 3. Role-Permission Matrix

| Function                              | Administrator | Laboratory Staff | Requester / Viewer |
|----------------------------------------|:---:|:---:|:---:|
| View equipment                         | ✅ | ✅ | ✅ |
| Add / update equipment                 | ✅ | ✅ | ❌ |
| Delete equipment                       | ✅ | ❌ | ❌ |
| Submit borrowing request               | ❌ | ❌ | ✅ |
| View own request status/history        | ✅ | ✅ | ✅ (own only) |
| Approve / reject request               | ✅ | ❌ | ❌ |
| Release approved equipment             | ✅ | ✅ | ❌ |
| Process return                         | ✅ | ✅ | ❌ |
| Manage users (change role)             | ✅ | ❌ | ❌ |
| View reports and audit logs            | ✅ | ❌ | ❌ |

---

## 4. Borrowing Approval Workflow

```
Borrowing Request Submitted
          │
          ▼
       Pending
          │
          ▼
Administrator Reviews Request
          │
   ┌──────┴──────┐
   ▼             ▼
Approved      Rejected
   │
   ▼
Released
   │
   ▼
Returned
   │
   ▼
 Closed
```
An equipment item that is not returned on time can also move from `Released` to
`Overdue`. Statuses used: **Pending, Approved, Rejected, Released, Returned,
Overdue, Closed**.

---

## 5. Business Rules

| ID | Rule | Where enforced |
|----|------|-----------------|
| BR-A4-01 | Only available equipment may be requested. | Database trigger + interface (request form only lists Available equipment) |
| BR-A4-02 | Staff cannot approve their own request. | Database trigger + interface (Approve button hidden for own requests) |
| BR-A4-03 | Only Administrator may approve or reject requests. | Database trigger + interface (buttons hidden for non-admins) |
| BR-A4-04 | Only Approved requests may be released. | Database trigger |
| BR-A4-05 | Released equipment becomes Borrowed. | Database trigger |
| BR-A4-06 | Returned equipment becomes Available unless damaged. | Database trigger |
| BR-A4-07 | Rejected requests cannot be released. | Database trigger (release requires prior status = Approved) |
| BR-A4-08 | Returned transactions cannot be processed twice. | Database trigger (return requires prior status = Released) |
| BR-A4-09 | Equipment under Maintenance cannot be borrowed. | Database trigger (same check as BR-A4-01: status must be Available) |
| BR-A4-10 | Sensitive operations must be logged. | Application code writes to `audit_logs` after every approve, reject, release, return, user-role change, and equipment delete |

---

## 6. Audit Trail

The `audit_logs` table records: `id, user_id, action, module, record_id, description, created_at`.
It is only readable from the **Audit Log** page by Administrators. Example entry:

| user_id | action | module | record_id | description |
|---------|--------|--------|-----------|--------------|
| (Maria Santos) | APPROVED | Borrowing | 102 | Approved borrowing request 102 |

---

## 7. Functional Test Results

Fill in the **Result** column after testing your deployed app.

| Test ID | Scenario | Expected Result | Result |
|---------|----------|------------------|--------|
| TC-A4-01 | Viewer attempts to open Admin page | Access denied. | |
| TC-A4-02 | Staff submits request | Request saved as Pending. | |
| TC-A4-03 | Administrator approves request | Status becomes Approved; audit log created. | |
| TC-A4-04 | Administrator rejects request | Status becomes Rejected. | |
| TC-A4-05 | Attempt to release rejected request | Operation blocked. | |
| TC-A4-06 | Release approved equipment | Equipment becomes Borrowed. | |
| TC-A4-07 | Return released equipment | Equipment returns to appropriate status. | |
| TC-A4-08 | Check audit log after approval | Approval entry is visible. | |
| TC-A4-09 | Staff attempts restricted delete | Operation blocked. | |
| TC-A4-10 | Logout and open protected page | Redirected to login / access denied. | |

---

## 8. Submission Checklist

1. GitHub repository URL
2. Live GitHub Pages URL
3. Updated ERD and Use Case Diagram (see Section 9 below for the ERD used in this build)
4. Role-permission matrix — Section 3 above
5. Workflow diagram — Section 4 above
6. Business rules — Section 5 above
7. Audit-log screenshot — take a screenshot of the Audit Log page after testing
8. Functional test results — Section 7 above

---

## 9. ERD (entity relationships used in this build)

```
profiles (id, full_name, role)
   │ 1
   │
   │ many
borrowing_requests (id, requester_id -> profiles.id, equipment_id -> equipment.id,
                     status, remarks, approved_by -> profiles.id, created_at, updated_at)
   │ many
   │
   │ 1
equipment (id, name, description, status)

audit_logs (id, user_id -> profiles.id, action, module, record_id, description, created_at)
```
