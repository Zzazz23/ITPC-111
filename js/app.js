import { supabase } from "./supabaseClient.js";

let currentUser = null;   // Supabase auth user
let currentProfile = null; // { id, full_name, role }

const messageBox = document.getElementById("message-box");

function showMessage(text, isError = true) {
  messageBox.textContent = text;
  messageBox.hidden = false;
  messageBox.style.background = isError ? "#fdecea" : "#e9f7ef";
  messageBox.style.color = isError ? "#b3261e" : "#1e6b3c";
  messageBox.style.borderColor = isError ? "#f5c6c2" : "#bfe3cc";
  setTimeout(() => (messageBox.hidden = true), 4000);
}

// Records an entry in audit_logs. BR-A4-10: sensitive operations must be logged.
async function logAudit(action, module, recordId, description) {
  await supabase.from("audit_logs").insert({
    user_id: currentUser.id,
    action,
    module,
    record_id: String(recordId),
    description,
  });
}

// ------------------------------------------------------------
// AUTH / ROLE SETUP
// ------------------------------------------------------------
async function init() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return;
  }
  currentUser = data.session.user;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (error || !profile) {
    showMessage("Could not load your profile. Please contact an Administrator.");
    return;
  }
  currentProfile = profile;

  document.getElementById("user-info").textContent =
    `${profile.full_name} (${capitalize(profile.role)})`;

  buildNav();
  document.getElementById("logout-btn").addEventListener("click", logout);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "index.html";
}

// ------------------------------------------------------------
// NAVIGATION (adapts to logged-in role - Section VII)
// ------------------------------------------------------------
const NAV_ITEMS = {
  admin: [
    { id: "view-equipment", label: "Equipment" },
    { id: "view-all-requests", label: "Requests" },
    { id: "view-users", label: "Manage Users" },
    { id: "view-audit", label: "Audit Log" },
  ],
  staff: [
    { id: "view-equipment", label: "Equipment" },
    { id: "view-all-requests", label: "Requests" },
  ],
  requester: [
    { id: "view-equipment", label: "Equipment" },
    { id: "view-submit-request", label: "Submit Request" },
    { id: "view-my-requests", label: "My Requests" },
  ],
};

function buildNav() {
  const nav = document.getElementById("nav-menu");
  nav.innerHTML = "";
  const items = NAV_ITEMS[currentProfile.role] || [];

  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.textContent = item.label;
    btn.dataset.target = item.id;
    if (index === 0) btn.classList.add("active");
    btn.addEventListener("click", () => showView(item.id));
    nav.appendChild(btn);
  });

  if (items.length) showView(items[0].id);

  if (currentProfile.role === "admin") {
    document.getElementById("add-equipment-box").hidden = false;
  }
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");

  document.querySelectorAll(".nav-menu button").forEach((b) => {
    b.classList.toggle("active", b.dataset.target === viewId);
  });

  // Interface-level guard: only load data the current role is allowed to see.
  if (viewId === "view-equipment") loadEquipment();
  if (viewId === "view-submit-request") loadEquipmentForRequestForm();
  if (viewId === "view-my-requests") loadMyRequests();
  if (viewId === "view-all-requests") loadAllRequests();
  if (viewId === "view-users") loadUsers();
  if (viewId === "view-audit") loadAuditLogs();
}

// ------------------------------------------------------------
// EQUIPMENT
// ------------------------------------------------------------
async function loadEquipment() {
  const { data, error } = await supabase.from("equipment").select("*").order("id");
  if (error) return showMessage(error.message);

  const tbody = document.getElementById("equipment-table-body");
  tbody.innerHTML = "";
  data.forEach((eq) => {
    const canManage = currentProfile.role === "admin" || currentProfile.role === "staff";
    const canDelete = currentProfile.role === "admin";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${eq.id}</td>
      <td>${eq.name}</td>
      <td>${eq.description ?? ""}</td>
      <td><span class="status-badge">${eq.status}</span></td>
      <td>${canDelete ? `<button class="action-btn delete" data-id="${eq.id}">Delete</button>` : ""}</td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteEquipment(btn.dataset.id));
  });
}

document.getElementById("add-equipment-btn")?.addEventListener("click", async () => {
  const name = document.getElementById("new-equipment-name").value.trim();
  const description = document.getElementById("new-equipment-desc").value.trim();
  if (!name) return showMessage("Equipment name is required.");

  const { data, error } = await supabase
    .from("equipment")
    .insert({ name, description })
    .select()
    .single();

  if (error) return showMessage(error.message);

  await logAudit("CREATE", "Equipment", data.id, `Added equipment ${name}`);
  document.getElementById("new-equipment-name").value = "";
  document.getElementById("new-equipment-desc").value = "";
  showMessage("Equipment added.", false);
  loadEquipment();
});

async function deleteEquipment(id) {
  const { error } = await supabase.from("equipment").delete().eq("id", id);
  if (error) return showMessage(error.message); // e.g. blocked by DB-level role policy
  await logAudit("DELETE", "Equipment", id, `Deleted equipment ${id}`);
  showMessage("Equipment deleted.", false);
  loadEquipment();
}

// ------------------------------------------------------------
// SUBMIT REQUEST (Requester) - BR-A4-01
// ------------------------------------------------------------
async function loadEquipmentForRequestForm() {
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("status", "Available")
    .order("name");
  if (error) return showMessage(error.message);

  const select = document.getElementById("request-equipment-select");
  select.innerHTML = "";
  if (!data.length) {
    select.innerHTML = `<option value="">No available equipment</option>`;
    return;
  }
  data.forEach((eq) => {
    const opt = document.createElement("option");
    opt.value = eq.id;
    opt.textContent = eq.name;
    select.appendChild(opt);
  });
}

document.getElementById("submit-request-btn")?.addEventListener("click", async () => {
  const equipmentId = document.getElementById("request-equipment-select").value;
  if (!equipmentId) return showMessage("Select equipment first.");

  const { data, error } = await supabase
    .from("borrowing_requests")
    .insert({ requester_id: currentUser.id, equipment_id: equipmentId, status: "Pending" })
    .select()
    .single();

  if (error) return showMessage(error.message); // e.g. equipment not Available (BR-A4-01)

  showMessage("Request submitted as Pending.", false);
  loadEquipmentForRequestForm();
});

// ------------------------------------------------------------
// MY REQUESTS (Requester)
// ------------------------------------------------------------
async function loadMyRequests() {
  const { data, error } = await supabase
    .from("borrowing_requests")
    .select("*, equipment(name)")
    .eq("requester_id", currentUser.id)
    .order("created_at", { ascending: false });
  if (error) return showMessage(error.message);

  const tbody = document.getElementById("my-requests-table-body");
  tbody.innerHTML = "";
  data.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.equipment?.name ?? ""}</td>
      <td><span class="status-badge">${r.status}</span></td>
      <td>${new Date(r.created_at).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ------------------------------------------------------------
// ALL REQUESTS (Staff / Admin) - approval workflow
// ------------------------------------------------------------
async function loadAllRequests() {
  const { data, error } = await supabase
    .from("borrowing_requests")
    .select("*, equipment(name), profiles!borrowing_requests_requester_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (error) return showMessage(error.message);

  const tbody = document.getElementById("all-requests-table-body");
  tbody.innerHTML = "";

  data.forEach((r) => {
    const tr = document.createElement("tr");
    const actions = [];

    // BR-A4-03: only Administrator may approve/reject. BR-A4-02: not their own request.
    if (currentProfile.role === "admin" && r.status === "Pending") {
      if (r.requester_id === currentUser.id) {
        actions.push(`<span class="status-badge">Own request - cannot approve</span>`);
      } else {
        actions.push(`<button class="action-btn approve" data-id="${r.id}" data-action="Approved">Approve</button>`);
        actions.push(`<button class="action-btn reject" data-id="${r.id}" data-action="Rejected">Reject</button>`);
      }
    }

    // BR-A4-04: only Approved requests may be released
    if ((currentProfile.role === "admin" || currentProfile.role === "staff") && r.status === "Approved") {
      actions.push(`<button class="action-btn" data-id="${r.id}" data-action="Released">Release</button>`);
    }

    // Return a released item; mark damaged if needed (BR-A4-06, BR-A4-08)
    if ((currentProfile.role === "admin" || currentProfile.role === "staff") && r.status === "Released") {
      actions.push(`<button class="action-btn" data-id="${r.id}" data-action="Returned" data-damaged="false">Return</button>`);
      actions.push(`<button class="action-btn reject" data-id="${r.id}" data-action="Returned" data-damaged="true">Return (Damaged)</button>`);
    }

    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.profiles?.full_name ?? ""}</td>
      <td>${r.equipment?.name ?? ""}</td>
      <td><span class="status-badge">${r.status}</span></td>
      <td>${actions.join(" ")}</td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      updateRequestStatus(btn.dataset.id, btn.dataset.action, btn.dataset.damaged === "true")
    );
  });
}

async function updateRequestStatus(requestId, newStatus, damaged = false) {
  const remarks = newStatus === "Returned" && damaged ? "Damaged on return" : null;

  const { error } = await supabase
    .from("borrowing_requests")
    .update({ status: newStatus, remarks })
    .eq("id", requestId);

  if (error) return showMessage(error.message); // business rule blocked at DB level

  // BR-A4-10: log every sensitive transaction change
  await logAudit(
    newStatus.toUpperCase(),
    "Borrowing",
    requestId,
    `${newStatus} borrowing request ${requestId}`
  );

  showMessage(`Request ${requestId} marked as ${newStatus}.`, false);
  loadAllRequests();
}

// ------------------------------------------------------------
// USERS (Admin only)
// ------------------------------------------------------------
async function loadUsers() {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) return showMessage(error.message);

  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";
  data.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.full_name}</td>
      <td><span class="status-badge">${capitalize(u.role)}</span></td>
      <td>
        <select data-id="${u.id}" class="role-select">
          <option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrator</option>
          <option value="staff" ${u.role === "staff" ? "selected" : ""}>Laboratory Staff</option>
          <option value="requester" ${u.role === "requester" ? "selected" : ""}>Requester / Viewer</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".role-select").forEach((sel) => {
    sel.addEventListener("change", () => changeUserRole(sel.dataset.id, sel.value));
  });
}

async function changeUserRole(userId, newRole) {
  const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);
  if (error) return showMessage(error.message);

  await logAudit("UPDATE", "Users", userId, `Changed role to ${newRole}`);
  showMessage("Role updated.", false);
}

// ------------------------------------------------------------
// AUDIT LOG (Admin only) - Section VI
// ------------------------------------------------------------
async function loadAuditLogs() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });
  if (error) return showMessage(error.message);

  const tbody = document.getElementById("audit-table-body");
  tbody.innerHTML = "";
  data.forEach((log) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(log.created_at).toLocaleString()}</td>
      <td>${log.profiles?.full_name ?? log.user_id}</td>
      <td>${log.action}</td>
      <td>${log.module}</td>
      <td>${log.record_id ?? ""}</td>
      <td>${log.description ?? ""}</td>
    `;
    tbody.appendChild(tr);
  });
}

init();
