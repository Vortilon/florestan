/**
 * Inspection Form - Main controller for the inspection form page
 */

(() => {
  // Get project ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("project") || "demo_project";
  
  // Get aircraft type from surveillances data
  let aircraftType = "ATR"; // Default, will be loaded from project data

  // Initialize managers
  let dataManager;
  let formLoader;
  let photoManagers = {};

  // DOM elements
  const els = {
    projectInfo: document.getElementById("projectInfo"),
    sectionMenu: document.getElementById("sectionMenu"),
    sectionMenuBtn: document.getElementById("sectionMenuBtn"),
    closeSectionMenu: document.getElementById("closeSectionMenu"),
    sectionMenuOverlay: document.getElementById("sectionMenuOverlay"),
    sectionMenuNav: document.getElementById("sectionMenuNav"),
    tabBtns: document.querySelectorAll(".tab-btn"),
    airTab: document.getElementById("airTab"),
    oprTab: document.getElementById("oprTab"),
    submitBtn: document.getElementById("submitBtn"),
    saveStatusBtn: document.getElementById("saveStatusBtn"),
  };

  // Load project data to get aircraft type
  async function loadProjectData() {
    try {
      const response = await fetch("data/surveillances.json");
      const data = await response.json();
      const project = data.projects.find(p => p.id === projectId);
      if (project) {
        aircraftType = project.model || "ATR";
        els.projectInfo.textContent = `${project.operator} - MSN ${project.msn} (${aircraftType})`;
      } else {
        els.projectInfo.textContent = `Project ${projectId} (${aircraftType})`;
      }
    } catch (e) {
      console.error("Error loading project data:", e);
      els.projectInfo.textContent = `Project ${projectId}`;
    }
  }

  // Initialize form
  async function initForm() {
    // Initialize data manager
    dataManager = new DataManager(projectId);

    // Initialize form loader
    formLoader = new FormLoader();
    await formLoader.loadTemplates();
    const template = formLoader.loadTemplate(aircraftType);

    if (!template) {
      console.error("Template not found");
      return;
    }

    // Render header
    renderHeader(template);

    // Render sections
    renderSection1(template);
    renderSection2(template);
    renderSection3(template);
    renderSection4(template);
    renderSection5(template);
    renderOPR(template);

    // Build section menu
    buildSectionMenu();

    // Setup auto-save for all fields
    dataManager.setupContainer(document.body);
  }

  function renderHeader(template) {
    const container = document.getElementById("headerFields");
    if (template.sections.header && template.sections.header.fields) {
      template.sections.header.fields.forEach(fieldDef => {
        const fieldElement = formLoader.renderField(fieldDef, container, dataManager);
        if (fieldElement) {
          container.appendChild(fieldElement);
        }
      });
    }
  }

  function renderSection1(template) {
    const container = document.getElementById("section1Content");
    if (template.sections.section1) {
      const sectionElement = formLoader.renderSection(template.sections.section1, container, dataManager);
      if (sectionElement) {
        container.appendChild(sectionElement);
      }
    }
  }

  function renderSection2(template) {
    const container = document.getElementById("section2Content");
    if (template.sections.section2) {
      const sectionElement = formLoader.renderSection(template.sections.section2, container, dataManager);
      if (sectionElement) {
        container.appendChild(sectionElement);
      }
    }
  }

  function renderSection3(template) {
    const container = document.getElementById("section3Content");
    if (template.sections.section3) {
      const sectionElement = formLoader.renderSection(template.sections.section3, container, dataManager);
      if (sectionElement) {
        container.appendChild(sectionElement);
      }
    }
  }

  function renderSection4(template) {
    const container = document.getElementById("section4Content");
    if (template.sections.section4 && template.sections.section4.locations) {
      // Initialize photo managers for each location
      Object.keys(template.sections.section4.locations).forEach(locationKey => {
        photoManagers[locationKey] = new PhotoManager(projectId, locationKey);
      });

      // Render metadata fields first
      if (template.sections.section4.metadata && template.sections.section4.metadata.fields) {
        const metadataDiv = document.createElement("div");
        metadataDiv.className = "grid gap-4 md:grid-cols-2 mb-6";
        template.sections.section4.metadata.fields.forEach(fieldDef => {
          const fieldElement = formLoader.renderField(fieldDef, metadataDiv, dataManager);
          if (fieldElement) {
            metadataDiv.appendChild(fieldElement);
          }
        });
        container.appendChild(metadataDiv);
      }

      // Render locations
      Object.entries(template.sections.section4.locations).forEach(([locationKey, locationDef]) => {
        const photoManager = photoManagers[locationKey];
        const locationElement = formLoader.renderLocation(locationDef, container, dataManager, photoManager);
        if (locationElement) {
          container.appendChild(locationElement);
        }
      });
    }
  }

  function renderSection5(template) {
    const container = document.getElementById("section5Content");
    if (template.sections.section5) {
      const sectionDiv = document.createElement("div");
      sectionDiv.className = "space-y-4";

      if (template.sections.section5.description) {
        const desc = document.createElement("p");
        desc.className = "text-sm text-slate-600 mb-4";
        desc.textContent = template.sections.section5.description;
        sectionDiv.appendChild(desc);
      }

      // General photo manager for section 5
      const generalPhotoManager = new PhotoManager(projectId, "general");
      const photoInputContainer = document.createElement("div");
      const photoInput = generalPhotoManager.createPhotoInput(photoInputContainer, () => {
        generalPhotoManager.updatePhotoGrid(photoGrid, () => {});
      });
      const captureBtn = generalPhotoManager.createCaptureButton(photoInputContainer, photoInput);
      sectionDiv.appendChild(photoInputContainer);

      const photoGrid = generalPhotoManager.createPhotoGrid(sectionDiv, () => {});
      sectionDiv.appendChild(photoGrid);

      container.appendChild(sectionDiv);
    }
  }

  function renderOPR(template) {
    const container = document.getElementById("oprContent");
    if (template.sections.opr) {
      const oprSection = formLoader.renderSection(template.sections.opr, container, dataManager);
      if (oprSection) {
        container.appendChild(oprSection);
      }
    }
  }

  function buildSectionMenu() {
    const sections = [
      { id: "section-header", title: "Aircraft Info" },
      { id: "section-1", title: "Executive Summary" },
      { id: "section-2", title: "Technical Specification" },
      { id: "section-3", title: "Supporting Documentation" },
      { id: "section-4", title: "Physical Inspection" },
      { id: "section-5", title: "Photos" }
    ];

    sections.forEach(section => {
      const link = document.createElement("a");
      link.href = `#${section.id}`;
      link.className = "block px-3 py-2 rounded-lg hover:bg-slate-100 text-sm text-slate-700";
      link.textContent = section.title;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(section.id);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          closeSectionMenu();
        }
      });
      els.sectionMenuNav.appendChild(link);
    });
  }

  function openSectionMenu() {
    els.sectionMenu.classList.remove("hidden");
    els.sectionMenu.classList.remove("translate-x-full");
    els.sectionMenuOverlay.classList.remove("hidden");
  }

  function closeSectionMenu() {
    els.sectionMenu.classList.add("translate-x-full");
    els.sectionMenuOverlay.classList.add("hidden");
  }

  function switchTab(tabName) {
    // Update tab buttons
    els.tabBtns.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add("active", "text-slate-900", "border-slate-900");
        btn.classList.remove("text-slate-600", "border-transparent");
      } else {
        btn.classList.remove("active", "text-slate-900", "border-slate-900");
        btn.classList.add("text-slate-600", "border-transparent");
      }
    });

    // Update tab content
    if (tabName === "air") {
      els.airTab.classList.remove("hidden");
      els.oprTab.classList.add("hidden");
    } else {
      els.airTab.classList.add("hidden");
      els.oprTab.classList.remove("hidden");
    }
  }

  function handleSubmit() {
    if (confirm("Submit this inspection report? You will not be able to edit it after submission.")) {
      // In real app, this would send to server
      alert("Report submitted successfully! (This is a prototype - no actual submission occurred)");
      // Update status in localStorage
      if (dataManager) {
        dataManager.set("status", "SUBMITTED");
        dataManager.set("submittedAt", new Date().toISOString());
      }
    }
  }

  // Event listeners
  els.sectionMenuBtn.addEventListener("click", openSectionMenu);
  els.closeSectionMenu.addEventListener("click", closeSectionMenu);
  els.sectionMenuOverlay.addEventListener("click", closeSectionMenu);

  els.tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  els.submitBtn.addEventListener("click", handleSubmit);

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    // Ctrl/Cmd + S to save (prevent default browser save)
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (dataManager) {
        dataManager.saveData();
        // Show save feedback
        const toast = document.createElement("div");
        toast.className = "fixed right-4 top-20 z-50 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-lg";
        toast.textContent = "Saved";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      }
    }
  });

  // Initialize
  loadProjectData().then(() => {
    initForm();
  });
})();

