# Crizza D. Farofaldino BSIT 3-A
# Laboratory Asset and Service Management System (Laboratory Exercise 4)

# Submission Requirements
1. GitHub repository URL: https://github.com/Zzazz23/ITPC-111
2. Live GitHub Pages URL: https://zzazz23.github.io/ITPC-111/
3. Updated ERD and Use Case Diagram:
<img width="647" height="572" alt="Screenshot 2026-09-15 140528" src="https://github.com/user-attachments/assets/19b27d71-47eb-444f-a876-c1b55569086d" />

4. Role-permission matrix:
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
   
5. Workflow diagram:
What each role can do:
<img width="603" height="692" alt="Screenshot 2026-09-15 140802" src="https://github.com/user-attachments/assets/261a68f8-acff-4c7e-8c85-3612730f2205" />

And here's the borrowing approval workflow, showing how a request moves from submission through to closure:
<img width="428" height="478" alt="Screenshot 2026-09-15 140903" src="https://github.com/user-attachments/assets/889ca1cb-2566-4590-9fcc-b71d00108285" />

6. Business rules:
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

7. Audit-log screenshot:
<img width="1892" height="900" alt="Screenshot 2026-09-15 141621" src="https://github.com/user-attachments/assets/197706de-73a4-4162-b9d0-a95eb1caf763" />

8. Functional Testing
Test cases TC-A4-01 through TC-A4-10, as specified in Section VIII of the lab sheet, cover role-based access, the approval workflow, business-rule enforcement, and the audit trail. Results to be completed after live testing.
