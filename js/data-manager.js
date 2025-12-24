/**
 * Data Manager - Handles localStorage operations, auto-save with visual feedback
 */

class DataManager {
  constructor(projectId, storageKey = "dae_inspection_data") {
    this.projectId = projectId;
    this.storageKey = storageKey;
    this.saveTimeout = null;
    this.debounceDelay = 300; // ms
    this.data = this.loadData();
  }

  loadData() {
    try {
      const stored = localStorage.getItem(`${this.storageKey}_${this.projectId}`);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error("Error loading data:", e);
      return {};
    }
  }

  saveData() {
    try {
      localStorage.setItem(`${this.storageKey}_${this.projectId}`, JSON.stringify(this.data));
      return true;
    } catch (e) {
      console.error("Error saving data:", e);
      return false;
    }
  }

  get(fieldId) {
    return this.data[fieldId] || "";
  }

  set(fieldId, value) {
    this.data[fieldId] = value;
    this.debouncedSave();
  }

  setMultiple(fields) {
    Object.assign(this.data, fields);
    this.debouncedSave();
  }

  getAll() {
    return { ...this.data };
  }

  clear() {
    this.data = {};
    localStorage.removeItem(`${this.storageKey}_${this.projectId}`);
  }

  debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveData();
    }, this.debounceDelay);
  }

  /**
   * Setup auto-save with visual feedback for a field
   * @param {HTMLElement} field - Input, textarea, or select element
   * @param {string} fieldId - Unique identifier for the field
   */
  setupAutoSave(field, fieldId) {
    if (!field) return;

    // Load existing value
    const existingValue = this.get(fieldId);
    if (existingValue && field.type !== "file") {
      if (field.type === "checkbox" || field.type === "radio") {
        if (field.value === existingValue) {
          field.checked = true;
        }
      } else {
        field.value = existingValue;
      }
    }

    // Save on input/change
    const saveHandler = (e) => {
      let value;
      if (field.type === "checkbox") {
        value = field.checked ? field.value : "";
      } else if (field.type === "radio") {
        if (field.checked) {
          value = field.value;
          // Update all radios in the group
          document.querySelectorAll(`input[name="${field.name}"]`).forEach(radio => {
            if (radio !== field) {
              this.data[fieldId] = field.value;
            }
          });
        } else {
          return; // Don't save if unchecked radio
        }
      } else if (field.type === "file") {
        // Handle files separately via photo-manager
        return;
      } else {
        value = field.value;
      }

      this.set(fieldId, value);
      this.showSaveFeedback(field);
    };

    // Handle paste events
    field.addEventListener("paste", (e) => {
      setTimeout(() => {
        const value = field.value;
        this.set(fieldId, value);
        this.showSaveFeedback(field);
      }, 10);
    });

    // Handle input events (typing)
    field.addEventListener("input", saveHandler);
    field.addEventListener("change", saveHandler);

    // Mark field as managed
    field.dataset.autoSave = "true";
    field.dataset.fieldId = fieldId;
  }

  /**
   * Show visual feedback that data was saved (green flash)
   */
  showSaveFeedback(field) {
    // Remove any existing animation class
    field.classList.remove("field-saved");

    // Trigger reflow
    void field.offsetWidth;

    // Add animation class
    field.classList.add("field-saved");

    // Remove class after animation completes
    setTimeout(() => {
      field.classList.remove("field-saved");
    }, 1500);
  }

  /**
   * Setup auto-save for all fields in a container
   */
  setupContainer(container) {
    const fields = container.querySelectorAll("input, textarea, select");
    fields.forEach((field, index) => {
      const fieldId = field.id || field.name || `field_${index}`;
      if (!field.dataset.autoSave) {
        this.setupAutoSave(field, fieldId);
      }
    });
  }

  /**
   * Save table row data
   */
  saveTableRow(tableId, rowIndex, data) {
    const tableKey = `${tableId}_row_${rowIndex}`;
    this.set(tableKey, data);
  }

  /**
   * Load table row data
   */
  loadTableRow(tableId, rowIndex) {
    const tableKey = `${tableId}_row_${rowIndex}`;
    return this.get(tableKey) || {};
  }

  /**
   * Export data as JSON
   */
  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Import data from JSON
   */
  importData(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.data = { ...this.data, ...imported };
      this.saveData();
      return true;
    } catch (e) {
      console.error("Error importing data:", e);
      return false;
    }
  }

  /**
   * Get save status indicator
   */
  getSaveStatus() {
    return {
      hasData: Object.keys(this.data).length > 0,
      lastSaved: new Date().toISOString(), // In real app, track actual save time
      dataSize: JSON.stringify(this.data).length
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DataManager;
}

