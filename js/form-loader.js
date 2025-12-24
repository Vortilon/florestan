/**
 * Form Loader - Loads and renders report templates based on aircraft type
 */

class FormLoader {
  constructor() {
    this.templates = null;
    this.currentTemplate = null;
    this.currentAircraftType = null;
  }

  async loadTemplates() {
    try {
      const response = await fetch("data/report-templates.json");
      if (!response.ok) throw new Error("Failed to load templates");
      this.templates = await response.json();
      return true;
    } catch (e) {
      console.error("Error loading templates:", e);
      return false;
    }
  }

  /**
   * Load template for specific aircraft type
   */
  loadTemplate(aircraftType) {
    if (!this.templates) {
      console.error("Templates not loaded");
      return null;
    }

    const template = this.templates[aircraftType];
    if (!template) {
      console.error(`Template not found for aircraft type: ${aircraftType}`);
      return null;
    }

    this.currentTemplate = template;
    this.currentAircraftType = aircraftType;
    return template;
  }

  /**
   * Get component configuration
   */
  getComponents() {
    if (!this.currentTemplate) return null;
    return this.currentTemplate.components || {};
  }

  /**
   * Render a field based on field definition
   */
  renderField(fieldDef, container, dataManager, fieldPrefix = "") {
    const fieldId = fieldPrefix ? `${fieldPrefix}_${fieldDef.id}` : fieldDef.id;
    const fieldDiv = document.createElement("div");
    fieldDiv.className = "field flex flex-col gap-2";

    // Label
    if (fieldDef.label) {
      const label = document.createElement("label");
      label.className = "text-[10px] md:text-xs font-semibold uppercase tracking-wide text-slate-400";
      label.textContent = fieldDef.label;
      if (fieldDef.required) {
        label.innerHTML += ' <span class="text-red-500">*</span>';
      }
      fieldDiv.appendChild(label);
    }

    let input;

    switch (fieldDef.type) {
      case "text":
      case "date":
        input = document.createElement("input");
        input.type = fieldDef.type;
        input.className = "w-full rounded-lg border border-slate-200 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm focus:border-slate-400 focus:outline-none";
        if (fieldDef.placeholder) input.placeholder = fieldDef.placeholder;
        break;

      case "textarea":
        input = document.createElement("textarea");
        input.className = "w-full rounded-lg border border-slate-200 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm focus:border-slate-400 focus:outline-none resize-y";
        input.rows = fieldDef.rows || 3;
        if (fieldDef.placeholder) input.placeholder = fieldDef.placeholder;
        break;

      case "number":
        input = document.createElement("input");
        input.type = "number";
        input.className = "w-full rounded-lg border border-slate-200 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm focus:border-slate-400 focus:outline-none";
        if (fieldDef.min !== undefined) input.min = fieldDef.min;
        if (fieldDef.max !== undefined) input.max = fieldDef.max;
        break;

      case "radio":
        const radioGroup = document.createElement("div");
        radioGroup.className = "flex flex-wrap gap-3 md:gap-4";
        fieldDef.options.forEach((option, idx) => {
          const radioWrapper = document.createElement("label");
          radioWrapper.className = "flex items-center gap-2 cursor-pointer";
          const radio = document.createElement("input");
          radio.type = "radio";
          radio.name = fieldId;
          radio.value = option;
          radio.className = "h-4 w-4 text-slate-900";
          const span = document.createElement("span");
          span.className = "text-xs md:text-sm text-slate-700";
          span.textContent = option;
          radioWrapper.appendChild(radio);
          radioWrapper.appendChild(span);
          radioGroup.appendChild(radioWrapper);
        });
        fieldDiv.appendChild(radioGroup);
        if (dataManager) {
          radioGroup.querySelectorAll("input[type='radio']").forEach(radio => {
            dataManager.setupAutoSave(radio, fieldId);
          });
        }
        return fieldDiv;

      case "checkbox":
        const checkboxGroup = document.createElement("div");
        checkboxGroup.className = "flex flex-wrap gap-3 md:gap-4";
        fieldDef.options.forEach((option) => {
          const checkboxWrapper = document.createElement("label");
          checkboxWrapper.className = "flex items-center gap-2 cursor-pointer";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = option;
          checkbox.className = "h-4 w-4 rounded border-slate-300 text-slate-900";
          const span = document.createElement("span");
          span.className = "text-xs md:text-sm text-slate-700";
          span.textContent = option;
          checkboxWrapper.appendChild(checkbox);
          checkboxWrapper.appendChild(span);
          checkboxGroup.appendChild(checkboxWrapper);
        });
        fieldDiv.appendChild(checkboxGroup);
        if (dataManager) {
          checkboxGroup.querySelectorAll("input[type='checkbox']").forEach(cb => {
            dataManager.setupAutoSave(cb, `${fieldId}_${cb.value}`);
          });
        }
        return fieldDiv;
    }

    if (input) {
      input.id = fieldId;
      input.name = fieldId;
      if (fieldDef.required) input.required = true;
      fieldDiv.appendChild(input);
      if (dataManager) {
        dataManager.setupAutoSave(input, fieldId);
      }
    }

    return fieldDiv;
  }

  /**
   * Render component group (engines, gears, propellers)
   */
  renderComponentGroup(fieldDef, container, dataManager, components) {
    const componentType = fieldDef.component;
    const componentCount = components[componentType] || 0;
    const componentTypes = components[`${componentType}Types`] || [];

    const groupDiv = document.createElement("div");
    groupDiv.className = "space-y-4";

    if (fieldDef.label) {
      const label = document.createElement("div");
      label.className = "text-sm font-semibold text-slate-700 mb-3";
      label.textContent = fieldDef.label;
      groupDiv.appendChild(label);
    }

    // Create lines for each component
    for (let i = 0; i < componentCount; i++) {
      const componentDiv = document.createElement("div");
      componentDiv.className = "rounded-lg border border-slate-200 bg-slate-50 p-3 md:p-4";

      const componentLabel = document.createElement("div");
      componentLabel.className = "text-xs md:text-sm font-semibold text-slate-700 mb-3";
      
      if (componentTypes.length > 0 && i < componentTypes.length) {
        componentLabel.textContent = `${componentTypes[i]} ${fieldDef.component.charAt(0).toUpperCase() + fieldDef.component.slice(1)}`;
      } else {
        componentLabel.textContent = `${fieldDef.component.charAt(0).toUpperCase() + fieldDef.component.slice(1)} ${i + 1}`;
      }
      componentDiv.appendChild(componentLabel);

      // Render fields for this component
      const componentPrefix = `${fieldDef.id}_${i}`;
      fieldDef.fields.forEach(subField => {
        const fieldElement = this.renderField(subField, componentDiv, dataManager, componentPrefix);
        if (fieldElement) {
          componentDiv.appendChild(fieldElement);
        }
      });

      groupDiv.appendChild(componentDiv);
    }

    return groupDiv;
  }

  /**
   * Render table
   */
  renderTable(tableDef, container, dataManager, tableId) {
    const tableDiv = document.createElement("div");
    tableDiv.className = "overflow-x-auto rounded-lg border border-slate-200";

    const table = document.createElement("table");
    table.className = "min-w-full text-left text-xs text-slate-600";

    // Header
    const thead = document.createElement("thead");
    thead.className = "border-b border-slate-200 bg-slate-50 text-[10px] md:text-[11px] font-semibold uppercase tracking-wide text-slate-400";
    const headerRow = document.createElement("tr");
    tableDef.columns.forEach(col => {
      const th = document.createElement("th");
      th.className = "px-2 md:px-3 py-2";
      th.textContent = col;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    const rowCount = tableDef.rows || 2;
    for (let i = 0; i < rowCount; i++) {
      const row = document.createElement("tr");
      row.className = "border-b border-slate-100";
      tableDef.columns.forEach((col, colIdx) => {
        const td = document.createElement("td");
        td.className = "px-2 md:px-3 py-2";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "w-full rounded border border-slate-200 px-2 py-1 text-xs";
        input.id = `${tableId}_row${i}_col${colIdx}`;
        input.name = `${tableId}_row${i}_col${colIdx}`;
        td.appendChild(input);
        row.appendChild(td);
        if (dataManager) {
          dataManager.setupAutoSave(input, `${tableId}_row${i}_col${colIdx}`);
        }
      });
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    tableDiv.appendChild(table);
    return tableDiv;
  }

  /**
   * Render location section
   */
  renderLocation(locationDef, container, dataManager, photoManager) {
    const locationDiv = document.createElement("div");
    locationDiv.className = "rounded-lg border border-slate-200 bg-white p-4 md:p-6 mb-6";
    locationDiv.id = `location-${locationDef.title.toLowerCase().replace(/\s+/g, "-")}`;

    // Title
    const title = document.createElement("h4");
    title.className = "text-base md:text-lg font-semibold text-slate-900 mb-2";
    title.textContent = locationDef.title;
    locationDiv.appendChild(title);

    // Description
    if (locationDef.description) {
      const desc = document.createElement("p");
      desc.className = "text-xs md:text-sm text-slate-600 mb-4";
      desc.textContent = locationDef.description;
      locationDiv.appendChild(desc);
    }

    // Photo reminder
    if (locationDef.photos && locationDef.photos.required && photoManager) {
      const reminder = photoManager.createPhotoReminder(
        locationDef.photos.count,
        locationDef.photos.description
      );
      locationDiv.appendChild(reminder);
    }

    // Fields
    if (locationDef.fields) {
      const fieldsContainer = document.createElement("div");
      fieldsContainer.className = "space-y-4";
      locationDef.fields.forEach(fieldDef => {
        const fieldElement = this.renderField(fieldDef, fieldsContainer, dataManager);
        if (fieldElement) {
          fieldsContainer.appendChild(fieldElement);
        }
      });
      locationDiv.appendChild(fieldsContainer);
    }

    // Component group (engines, gears, etc.)
    if (locationDef.component) {
      const components = this.getComponents();
      const componentGroup = this.renderComponentGroup(locationDef, locationDiv, dataManager, components);
      locationDiv.appendChild(componentGroup);
    }

    // Photo section
    if (locationDef.photos && photoManager) {
      const photoSection = document.createElement("div");
      photoSection.className = "mt-6 pt-6 border-t border-slate-200";
      
      const photoTitle = document.createElement("h5");
      photoTitle.className = "text-sm font-semibold text-slate-700 mb-3";
      photoTitle.textContent = "Photos";
      photoSection.appendChild(photoTitle);

      const photoInputContainer = document.createElement("div");
      const photoInput = photoManager.createPhotoInput(photoInputContainer, () => {
        photoManager.updatePhotoGrid(photoGrid, () => {});
      });
      const captureBtn = photoManager.createCaptureButton(photoInputContainer, photoInput);
      photoSection.appendChild(photoInputContainer);

      const photoGrid = photoManager.createPhotoGrid(photoSection, () => {});
      photoSection.appendChild(photoGrid);

      locationDiv.appendChild(photoSection);
    }

    return locationDiv;
  }

  /**
   * Render section
   */
  renderSection(sectionDef, container, dataManager, photoManagers = {}) {
    const sectionDiv = document.createElement("section");
    sectionDiv.className = "rounded-lg bg-white p-4 md:p-6 shadow-sm mb-6";

    if (sectionDef.title) {
      const title = document.createElement("h3");
      title.className = "text-lg md:text-xl font-semibold text-slate-900 mb-4";
      title.textContent = sectionDef.title;
      sectionDiv.appendChild(title);
    }

    // Subsections
    if (sectionDef.subsections) {
      Object.values(sectionDef.subsections).forEach(subsection => {
        const subDiv = document.createElement("div");
        subDiv.className = "mb-6";
        
        if (subsection.title) {
          const subTitle = document.createElement("h4");
          subTitle.className = "text-base font-semibold text-slate-900 mb-3";
          subTitle.textContent = subsection.title;
          subDiv.appendChild(subTitle);
        }

        if (subsection.fields) {
          const fieldsContainer = document.createElement("div");
          fieldsContainer.className = "grid gap-4 md:grid-cols-2";
          subsection.fields.forEach(fieldDef => {
            if (fieldDef.type === "component_group") {
              const components = this.getComponents();
              const componentGroup = this.renderComponentGroup(fieldDef, fieldsContainer, dataManager, components);
              fieldsContainer.appendChild(componentGroup);
            } else {
              const fieldElement = this.renderField(fieldDef, fieldsContainer, dataManager);
              if (fieldElement) {
                fieldsContainer.appendChild(fieldElement);
              }
            }
          });
          subDiv.appendChild(fieldsContainer);
        }

        if (subsection.type === "table") {
          const table = this.renderTable(subsection, subDiv, dataManager, subsection.title?.toLowerCase().replace(/\s+/g, "_") || "table");
          subDiv.appendChild(table);
        }

        sectionDiv.appendChild(subDiv);
      });
    }

    // Locations (for Section 4 - Physical Inspection)
    if (sectionDef.locations) {
      Object.entries(sectionDef.locations).forEach(([locationKey, locationDef]) => {
        const photoManager = photoManagers[locationKey];
        const locationElement = this.renderLocation(locationDef, sectionDiv, dataManager, photoManager);
        sectionDiv.appendChild(locationElement);
      });
    }

    // Table sections
    if (sectionDef.type === "table") {
      const table = this.renderTable(sectionDef, sectionDiv, dataManager, sectionDef.title?.toLowerCase().replace(/\s+/g, "_") || "table");
      sectionDiv.appendChild(table);
    }

    return sectionDiv;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = FormLoader;
}

