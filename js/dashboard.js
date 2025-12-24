(() => {
  const STORAGE_KEY = "dae_surveillance_local_edits_v1";
  const ROLE_KEY = "dae_user_role";

  const els = {
    tbody: document.getElementById("tbody"),
    mobileCards: document.getElementById("mobileCards"),
    q: document.getElementById("q"),
    fOperator: document.getElementById("fOperator"),
    fModel: document.getElementById("fModel"),
    fRegion: document.getElementById("fRegion"),
    fStatus: document.getElementById("fStatus"),
    fFM: document.getElementById("fFM"),
    dFrom: document.getElementById("dFrom"),
    dTo: document.getElementById("dTo"),
    countPill: document.getElementById("countPill"),
    dataPill: document.getElementById("dataPill"),
    clearFiltersBtn: document.getElementById("clearFiltersBtn"),
    roleSelector: document.getElementById("roleSelector"),
    adminView: document.getElementById("adminView") || null,
    sectionTitle: document.getElementById("sectionTitle"),
    sectionSubtitle: document.getElementById("sectionSubtitle"),
    modalBackdrop: document.getElementById("modalBackdrop"),
    modalTitle: document.getElementById("modalTitle"),
    modalSub: document.getElementById("modalSub"),
    modalBody: document.getElementById("modalBody"),
    modalFooter: document.getElementById("modalFooter"),
    modalClose: document.getElementById("modalClose"),
    createProjectBtn: document.getElementById("createProjectBtn"),
  };

  let contractors = [];
  let projects = [];
  let localEdits = loadLocalEdits();
  let currentRole = localStorage.getItem(ROLE_KEY) || "admin";

  const STATUS_PROGRESS = {
    "NOT ASSIGNED": 0,
    "SCHEDULED": 10,
    "ASSIGNED": 20,
    "IN PROGRESS": 60,
    "REVIEW PENDING": 85,
    "SUBMITTED": 85,
    "APPROVED": 100,
    "REJECTED": 100,
  };

  function loadLocalEdits() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function saveLocalEdits() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localEdits));
  }

  function toast(msg) {
    const d = document.createElement("div");
    d.className = "fixed right-4 top-20 z-[60] rounded-lg border border-slate-200 bg-white px-3 md:px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg";
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2000);
  }

  function uniqSorted(values) {
    const s = new Set(values.filter(v => String(v || "").trim() !== ""));
    return Array.from(s).sort((a,b) => String(a).localeCompare(String(b)));
  }

  function setOptions(select, items, placeholder) {
    select.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    items.forEach(v => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
  }

  async function loadData() {
    try {
      const res = await fetch("data/surveillances.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      
      contractors = data.contractors || [];
      projects = (data.projects || []).map(p => {
        const patch = localEdits[p.id];
        return patch ? { ...p, ...patch } : p;
      });

      setOptions(els.fOperator, uniqSorted(projects.map(p => p.operator)), "All operators");
      setOptions(els.fModel, uniqSorted(projects.map(p => p.model)), "All models");
      setOptions(els.fRegion, uniqSorted(projects.map(p => p.region)), "All regions");
      setOptions(els.fStatus, uniqSorted(projects.map(p => p.status)), "All statuses");
      setOptions(els.fFM, uniqSorted(projects.map(p => p.fm)), "All FMs");

      els.dataPill.textContent = `${projects.length} projects`;
      render();
    } catch (e) {
      els.dataPill.textContent = "Failed to load";
      console.error(e);
      toast("Failed to load data. Check console.");
    }
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    const m = d.toLocaleString(undefined, { month: "short" });
    return `${d.getDate().toString().padStart(2,"0")} ${m} ${d.getFullYear()}`;
  }

  function statusBadge(status) {
    const s = (status || "").toUpperCase();
    const base = "inline-flex items-center rounded-full border px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-[11px] font-semibold";
    if (s === "APPROVED") return `<span class="${base} border-emerald-200 bg-emerald-50 text-emerald-700">${escapeHtml(status)}</span>`;
    if (s === "REJECTED") return `<span class="${base} border-rose-200 bg-rose-50 text-rose-700">${escapeHtml(status)}</span>`;
    if (s === "IN PROGRESS") return `<span class="${base} border-sky-200 bg-sky-50 text-sky-700">${escapeHtml(status)}</span>`;
    if (s === "REVIEW PENDING" || s === "SUBMITTED") return `<span class="${base} border-amber-200 bg-amber-50 text-amber-700">${escapeHtml(status)}</span>`;
    if (s === "ASSIGNED" || s === "SCHEDULED") return `<span class="${base} border-indigo-200 bg-indigo-50 text-indigo-700">${escapeHtml(status)}</span>`;
    if (s === "NOT ASSIGNED") return `<span class="${base} border-slate-200 bg-slate-50 text-slate-700">${escapeHtml(status)}</span>`;
    return `<span class="${base} border-slate-200 bg-white text-slate-700">${escapeHtml(status)}</span>`;
  }

  function progressBar(pct) {
    const p = Math.max(0, Math.min(100, Number(pct || 0)));
    return `
      <div class="flex items-center gap-2">
        <div class="h-1.5 md:h-2 w-16 md:w-24 overflow-hidden rounded-full bg-slate-100">
          <div class="h-full bg-slate-900 transition-all" style="width:${p}%;"></div>
        </div>
        <span class="text-[10px] md:text-[11px] font-semibold text-slate-600">${p}%</span>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function iconBtn({ title, svg, onClick, disabled=false, className="" }) {
    const dis = disabled ? "opacity-40 pointer-events-none" : "hover:bg-slate-50 active:bg-slate-100";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `inline-flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-lg border border-slate-200 bg-white ${dis} ${className}`;
    btn.innerHTML = svg;
    btn.title = title;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function openModal({ title, sub, bodyHtml, footerButtons=[] }) {
    els.modalTitle.textContent = title || "—";
    els.modalSub.textContent = sub || "";
    els.modalBody.innerHTML = bodyHtml || "";
    els.modalFooter.innerHTML = "";
    footerButtons.forEach(b => els.modalFooter.appendChild(b));
    els.modalBackdrop.classList.remove("hidden");
  }

  function closeModal() {
    els.modalBackdrop.classList.add("hidden");
  }

  function applyEdit(projectId, patch) {
    localEdits[projectId] = { ...(localEdits[projectId] || {}), ...patch };
    saveLocalEdits();
    projects = projects.map(p => p.id === projectId ? { ...p, ...patch } : p);
    render();
  }

  function getFiltered() {
    const q = els.q.value.trim().toLowerCase();
    const op = els.fOperator.value;
    const model = els.fModel.value;
    const region = els.fRegion.value;
    const status = els.fStatus.value;
    const fm = els.fFM.value;
    const dFrom = els.dFrom.value ? new Date(els.dFrom.value + "T00:00:00").getTime() : null;
    const dTo = els.dTo.value ? new Date(els.dTo.value + "T23:59:59").getTime() : null;

    let filtered = projects.filter(p => {
      if (op && p.operator !== op) return false;
      if (model && p.model !== model) return false;
      if (region && p.region !== region) return false;
      if (status && p.status !== status) return false;
      if (fm && p.fm !== fm) return false;

      const ts = p.deadline ? new Date(p.deadline + "T00:00:00").getTime() : null;
      if (dFrom !== null && ts !== null && ts < dFrom) return false;
      if (dTo !== null && ts !== null && ts > dTo) return false;

      if (!q) return true;
      const hay = [
        p.operator, p.msn, p.model, p.deadline, p.fm, p.country, p.region, p.status, p.assignedTo
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });

    // Role-based filtering
    if (currentRole === "contractor") {
      const contractorName = "Contractor Name"; // In real app, get from auth
      filtered = filtered.filter(p => p.assignedTo === contractorName);
    } else if (currentRole === "fm") {
      const fmName = "FM Name"; // In real app, get from auth
      filtered = filtered.filter(p => p.fm === fmName);
    }

    return filtered;
  }

  function viewProject(p) {
    const body = `
      <div class="grid gap-4 md:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 md:p-4">
          <div class="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400">Project</div>
          <div class="mt-2 text-xs md:text-sm text-slate-700 space-y-1">
            <div><span class="font-semibold">Operator:</span> ${escapeHtml(p.operator || "—")}</div>
            <div><span class="font-semibold">MSN:</span> ${escapeHtml(p.msn || "—")}</div>
            <div><span class="font-semibold">Model:</span> ${escapeHtml(p.model || "—")}</div>
            <div><span class="font-semibold">Deadline:</span> ${escapeHtml(fmtDate(p.deadline) || "—")}</div>
            <div class="mt-2">${statusBadge(p.status)}</div>
          </div>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-3 md:p-4">
          <div class="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400">Progress</div>
          <div class="mt-2">${progressBar(p.progress ?? STATUS_PROGRESS[p.status] ?? 0)}</div>
          <div class="mt-3 text-[10px] md:text-xs text-slate-500">
            Assigned to: <span class="font-semibold text-slate-700">${escapeHtml(p.assignedTo || "—")}</span>
          </div>
          <div class="mt-2 text-[10px] md:text-xs text-slate-500">
            FM: <span class="font-semibold text-slate-700">${escapeHtml(p.fm || "—")}</span>
          </div>
        </div>
      </div>
    `;

    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.className = "rounded-lg bg-slate-900 px-3 md:px-4 py-1.5 md:py-2 text-xs font-semibold text-white hover:bg-slate-800";
    viewBtn.textContent = "Open Report";
    viewBtn.addEventListener("click", () => {
      window.location.href = `inspection-form.html?project=${p.id}`;
    });

    openModal({
      title: `${p.operator || "—"} / MSN ${p.msn || "—"}`,
      sub: `Project ID: ${p.id}`,
      bodyHtml: body,
      footerButtons: [viewBtn],
    });
  }

  function assignProject(p) {
    const options = contractors.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
    const body = `
      <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 md:p-4 text-xs md:text-sm">
        <div class="text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400">Assign Contractor</div>
        <div class="mt-2 text-slate-700">
          Operator: <span class="font-semibold">${escapeHtml(p.operator)}</span> · MSN: <span class="font-semibold">${escapeHtml(p.msn)}</span>
        </div>
        <label class="mt-4 block text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contractor</label>
        <select id="contractorSel" class="mt-1 w-full rounded-lg border border-slate-200 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm">
          <option value="">Select…</option>
          ${options}
        </select>

        <label class="mt-3 block text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400">Status</label>
        <select id="assignStatusSel" class="mt-1 w-full rounded-lg border border-slate-200 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm">
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="IN PROGRESS">IN PROGRESS</option>
        </select>
      </div>
    `;

    const assignBtn = document.createElement("button");
    assignBtn.type = "button";
    assignBtn.className = "rounded-lg bg-slate-900 px-3 md:px-4 py-1.5 md:py-2 text-xs font-semibold text-white hover:bg-slate-800";
    assignBtn.textContent = "Assign";
    assignBtn.addEventListener("click", () => {
      const c = document.getElementById("contractorSel").value;
      const st = document.getElementById("assignStatusSel").value;
      if (!c) { toast("Select a contractor."); return; }
      applyEdit(p.id, {
        assignedTo: c,
        status: st,
        progress: STATUS_PROGRESS[st] ?? 0
      });
      closeModal();
      toast("Assigned.");
    });

    openModal({
      title: "Assign project",
      sub: `${p.operator} · MSN ${p.msn}`,
      bodyHtml: body,
      footerButtons: [assignBtn],
    });
  }

  function approveReject(p, decision) {
    const next = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const body = `
      <div class="rounded-lg border border-slate-200 bg-white p-3 md:p-4 text-xs md:text-sm text-slate-700">
        Set status to <span class="font-semibold">${next}</span> for:
        <div class="mt-2 text-[10px] md:text-xs text-slate-500">${escapeHtml(p.operator)} · MSN ${escapeHtml(p.msn)} · ${escapeHtml(p.model || "")}</div>
      </div>
    `;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rounded-lg bg-slate-900 px-3 md:px-4 py-1.5 md:py-2 text-xs font-semibold text-white hover:bg-slate-800";
    btn.textContent = next;
    btn.addEventListener("click", () => {
      applyEdit(p.id, { status: next, progress: 100 });
      closeModal();
      toast("Updated.");
    });
    openModal({ title: "Review decision", sub: `Project ID: ${p.id}`, bodyHtml: body, footerButtons: [btn] });
  }

  function exportsAndReports(p) {
    const body = `
      <div class="space-y-3">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 md:p-4 text-xs md:text-sm text-slate-700">
          Approved record. Choose an export option below.
        </div>

        <div class="grid gap-2 md:grid-cols-2">
          <button data-act="xrm" class="actionBtn rounded-lg border border-slate-200 bg-white px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm hover:bg-slate-50">
            <div class="font-semibold">Export to xRM</div>
            <div class="mt-1 text-[10px] md:text-xs text-slate-500">XML export aligned to xRM standards</div>
          </button>

          <button data-act="ats" class="actionBtn rounded-lg border border-slate-200 bg-white px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm hover:bg-slate-50">
            <div class="font-semibold">Export to ATS</div>
            <div class="mt-1 text-[10px] md:text-xs text-slate-500">Package for ATS upload with naming protocol</div>
          </button>

          <button data-act="detailspec" class="actionBtn rounded-lg border border-slate-200 bg-white px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm hover:bg-slate-50">
            <div class="font-semibold">Generate Detail Spec</div>
            <div class="mt-1 text-[10px] md:text-xs text-slate-500">PDF specification document</div>
          </button>

          <button data-act="airreport" class="actionBtn rounded-lg border border-slate-200 bg-white px-3 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm hover:bg-slate-50">
            <div class="font-semibold">AIR Report</div>
            <div class="mt-1 text-[10px] md:text-xs text-slate-500">Generate AIR inspection report PDF</div>
          </button>
        </div>
      </div>
    `;

    openModal({
      title: "Exports & Reports",
      sub: `${p.operator} · MSN ${p.msn}`,
      bodyHtml: body,
      footerButtons: [],
    });

    setTimeout(() => {
      document.querySelectorAll(".actionBtn").forEach(btn => {
        btn.addEventListener("click", () => {
          const act = btn.getAttribute("data-act");
          const descriptions = {
            xrm: "This export will generate an XML file formatted according to xRM standards, containing all surveillance data for this project.",
            ats: "This export will package all records and photos according to ATS file naming protocol and upload standards.",
            detailspec: "This will generate a PDF Detail Specification document containing all technical specifications and inspection findings.",
            airreport: "This will generate the complete AIR (Aircraft Inspection Report) PDF with all sections, findings, and photos."
          };
          openModal({
            title: `Export: ${act.toUpperCase()}`,
            sub: "Export Information",
            bodyHtml: `<div class="rounded-lg border border-slate-200 bg-white p-3 md:p-4 text-xs md:text-sm text-slate-700">${descriptions[act] || "Export functionality will be implemented in the full version."}</div>`,
            footerButtons: []
          });
        });
      });
    }, 0);
  }

  function render() {
    const filtered = getFiltered();
    els.countPill.textContent = `${filtered.length} / ${projects.length}`;

    // Desktop table
    els.tbody.innerHTML = "";
    filtered.forEach(p => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 cursor-pointer";
      tr.addEventListener("click", () => viewProject(p));
      tr.innerHTML = `
        <td class="px-3 py-3 whitespace-nowrap">${escapeHtml(p.msn || "")}</td>
        <td class="px-3 py-3 whitespace-nowrap">${escapeHtml(p.operator || "")}</td>
        <td class="px-3 py-3 whitespace-nowrap">${escapeHtml(p.model || "")}</td>
        <td class="px-3 py-3 whitespace-nowrap">${escapeHtml(fmtDate(p.deadline))}</td>
        <td class="px-3 py-3 whitespace-nowrap">${escapeHtml(p.fm || "")}</td>
        <td class="px-3 py-3 whitespace-nowrap">${escapeHtml(p.assignedTo || "—")}</td>
        <td class="px-3 py-3 whitespace-nowrap">${statusBadge(p.status)}</td>
        <td class="px-3 py-3 whitespace-nowrap">${progressBar(p.progress ?? STATUS_PROGRESS[p.status] ?? 0)}</td>
        <td class="px-3 py-2 whitespace-nowrap" onclick="event.stopPropagation()">
          <div class="flex items-center justify-end gap-1" data-actions></div>
        </td>
      `;

      const actionsCell = tr.querySelector("[data-actions]");
      addActionButtons(actionsCell, p);
      els.tbody.appendChild(tr);
    });

    // Mobile cards
    els.mobileCards.innerHTML = "";
    filtered.forEach(p => {
      const card = document.createElement("div");
      card.className = "rounded-lg border border-slate-200 bg-white p-3 shadow-sm";
      card.innerHTML = `
        <div class="flex items-start justify-between mb-2">
          <div>
            <div class="font-semibold text-sm text-slate-900">MSN ${escapeHtml(p.msn || "")}</div>
            <div class="text-xs text-slate-600">${escapeHtml(p.operator || "")} · ${escapeHtml(p.model || "")}</div>
          </div>
          ${statusBadge(p.status)}
        </div>
        <div class="text-xs text-slate-600 mb-2">
          <div>FM: ${escapeHtml(p.fm || "")}</div>
          <div>Contractor: ${escapeHtml(p.assignedTo || "—")}</div>
          <div>Deadline: ${escapeHtml(fmtDate(p.deadline))}</div>
        </div>
        <div class="mb-2">${progressBar(p.progress ?? STATUS_PROGRESS[p.status] ?? 0)}</div>
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100" data-actions></div>
      `;
      const actionsCell = card.querySelector("[data-actions]");
      addActionButtons(actionsCell, p);
      card.addEventListener("click", (e) => {
        if (!e.target.closest("[data-actions]")) viewProject(p);
      });
      els.mobileCards.appendChild(card);
    });
  }

  function addActionButtons(container, p) {
    const eye = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const userPlus = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>`;
    const check = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>`;
    const x = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 md:h-4 md:w-4 text-rose-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>`;
    const report = `<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/></svg>`;

    container.appendChild(iconBtn({ title: "View", svg: eye, onClick: () => viewProject(p) }));

    const st = (p.status || "").toUpperCase();
    if (st === "NOT ASSIGNED" && (currentRole === "admin" || currentRole === "fm")) {
      container.appendChild(iconBtn({ title: "Assign", svg: userPlus, onClick: () => assignProject(p) }));
    } else if ((st === "REVIEW PENDING" || st === "SUBMITTED") && (currentRole === "admin" || currentRole === "fm")) {
      container.appendChild(iconBtn({ title: "Approve", svg: check, onClick: () => approveReject(p, "APPROVE") }));
      container.appendChild(iconBtn({ title: "Reject", svg: x, onClick: () => approveReject(p, "REJECT") }));
    } else if (st === "APPROVED") {
      container.appendChild(iconBtn({ title: "Reports / Exports", svg: report, onClick: () => exportsAndReports(p) }));
    }
  }

  function updateRoleView() {
    currentRole = els.roleSelector.value;
    localStorage.setItem(ROLE_KEY, currentRole);

    if (els.adminView) {
      if (currentRole === "admin") {
        els.adminView.classList.remove("hidden");
      } else {
        els.adminView.classList.add("hidden");
      }
    }

    if (currentRole === "admin") {
      els.sectionTitle.textContent = "All Projects";
      els.sectionSubtitle.textContent = "Manage and assign surveillance projects";
    } else if (currentRole === "fm") {
      els.sectionTitle.textContent = "My Projects";
      els.sectionSubtitle.textContent = "Projects assigned to you";
    } else {
      els.sectionTitle.textContent = "My Assignments";
      els.sectionSubtitle.textContent = "Active inspection reports";
    }
    render();
  }

  function wireFilters() {
    const inputs = [els.q, els.fOperator, els.fModel, els.fRegion, els.fStatus, els.fFM, els.dFrom, els.dTo];
    inputs.forEach(el => el.addEventListener("input", render));
    inputs.forEach(el => el.addEventListener("change", render));

    els.clearFiltersBtn.addEventListener("click", () => {
      els.q.value = "";
      els.fOperator.value = "";
      els.fModel.value = "";
      els.fRegion.value = "";
      els.fStatus.value = "";
      els.fFM.value = "";
      els.dFrom.value = "";
      els.dTo.value = "";
      render();
    });

    els.roleSelector.value = currentRole;
    els.roleSelector.addEventListener("change", updateRoleView);
    updateRoleView();

    els.modalBackdrop.addEventListener("click", (e) => { if (e.target === els.modalBackdrop) closeModal(); });
    els.modalClose.addEventListener("click", closeModal);

    if (els.createProjectBtn) {
      els.createProjectBtn.addEventListener("click", () => {
        toast("Create project functionality will be implemented in the full version.");
      });
    }
  }

  // Initialize
  setOptions(els.fOperator, [], "All operators");
  setOptions(els.fModel, [], "All models");
  setOptions(els.fRegion, [], "All regions");
  setOptions(els.fStatus, [], "All statuses");
  setOptions(els.fFM, [], "All FMs");

  wireFilters();
  loadData();
})();

