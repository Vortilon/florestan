/**
 * Validation - Mock AI validation logic for field validation, suggestions, and data consistency
 */

class Validation {
  constructor() {
    this.rules = this.initializeRules();
  }

  initializeRules() {
    return {
      required: (value, field) => {
        if (field.required && (!value || value.trim() === "")) {
          return { valid: false, message: "This field is required" };
        }
        return { valid: true };
      },
      date: (value) => {
        if (!value) return { valid: true };
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { valid: false, message: "Invalid date format" };
        }
        if (date > new Date()) {
          return { valid: false, message: "Date cannot be in the future", warning: true };
        }
        return { valid: true };
      },
      msn: (value) => {
        if (!value) return { valid: true };
        // MSN should be numeric or alphanumeric
        if (!/^[A-Z0-9]+$/i.test(value)) {
          return { valid: false, message: "MSN should contain only letters and numbers" };
        }
        return { valid: true };
      },
      email: (value) => {
        if (!value) return { valid: true };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { valid: false, message: "Invalid email format" };
        }
        return { valid: true };
      },
      phone: (value) => {
        if (!value) return { valid: true };
        // Basic phone validation
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(value)) {
          return { valid: false, message: "Invalid phone number format" };
        }
        return { valid: true };
      },
      serialNumber: (value) => {
        if (!value) return { valid: true };
        // Serial numbers are typically alphanumeric
        if (!/^[A-Z0-9\-]+$/i.test(value)) {
          return { valid: false, message: "Serial number format invalid" };
        }
        return { valid: true };
      },
      hoursCycles: (value) => {
        if (!value) return { valid: true };
        // Should be numeric with optional format like "12345 / 6789"
        const regex = /^[\d\s\/]+$/;
        if (!regex.test(value)) {
          return { valid: false, message: "Invalid hours/cycles format" };
        }
        return { valid: true };
      }
    };
  }

  /**
   * Validate a single field
   */
  validateField(field, value, context = {}) {
    const results = [];
    
    // Required check
    if (field.required) {
      const requiredResult = this.rules.required(value, field);
      if (!requiredResult.valid) {
        results.push(requiredResult);
      }
    }

    // Type-specific validation
    if (value && value.trim() !== "") {
      switch (field.type) {
        case "date":
          const dateResult = this.rules.date(value);
          if (!dateResult.valid) results.push(dateResult);
          break;
        case "email":
          const emailResult = this.rules.email(value);
          if (!emailResult.valid) results.push(emailResult);
          break;
      }

      // Field ID-based validation
      if (field.id) {
        if (field.id.includes("msn") || field.id.includes("MSN")) {
          const msnResult = this.rules.msn(value);
          if (!msnResult.valid) results.push(msnResult);
        }
        if (field.id.includes("serial") || field.id.includes("Serial")) {
          const serialResult = this.rules.serialNumber(value);
          if (!serialResult.valid) results.push(serialResult);
        }
        if (field.id.includes("phone") || field.id.includes("Phone")) {
          const phoneResult = this.rules.phone(value);
          if (!phoneResult.valid) results.push(phoneResult);
        }
        if (field.id.includes("hours") || field.id.includes("cycles") || field.id.includes("Hrs") || field.id.includes("Cycs")) {
          const hoursResult = this.rules.hoursCycles(value);
          if (!hoursResult.valid) results.push(hoursResult);
        }
      }
    }

    return {
      valid: results.length === 0,
      errors: results.filter(r => !r.warning),
      warnings: results.filter(r => r.warning),
      suggestions: this.generateSuggestions(field, value, context)
    };
  }

  /**
   * Generate AI suggestions based on field and value
   */
  generateSuggestions(field, value, context) {
    const suggestions = [];

    // Common value suggestions based on aircraft type
    if (context.aircraftType) {
      if (field.id === "aircraft_type" || field.id === "model") {
        const commonModels = {
          "ATR": ["ATR-72-600", "ATR-72-500", "ATR-42"],
          "A320": ["A320-200", "A320neo", "A320-214"],
          "A330": ["A330-200", "A330-300", "A330-900neo"]
        };
        const models = commonModels[context.aircraftType];
        if (models && !models.includes(value)) {
          suggestions.push({
            type: "suggestion",
            message: `Common ${context.aircraftType} models: ${models.join(", ")}`,
            values: models
          });
        }
      }
    }

    // Date suggestions
    if (field.type === "date") {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (!value) {
        suggestions.push({
          type: "suggestion",
          message: `Today's date: ${today.toISOString().split("T")[0]}`,
          value: today.toISOString().split("T")[0]
        });
      }
    }

    // Operator suggestions (if we have context)
    if (field.id === "operator" && context.operators) {
      if (value && !context.operators.includes(value)) {
        const matches = context.operators.filter(op => 
          op.toLowerCase().includes(value.toLowerCase())
        );
        if (matches.length > 0) {
          suggestions.push({
            type: "suggestion",
            message: `Did you mean: ${matches[0]}?`,
            values: matches.slice(0, 3)
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Check data consistency across fields
   */
  checkConsistency(data, context = {}) {
    const issues = [];

    // Check date consistency
    const reportDate = data.report_date || data.inspection_report_date;
    const physicalDate = data.physical_date || data.physical_inspection_date;
    
    if (reportDate && physicalDate) {
      const report = new Date(reportDate);
      const physical = new Date(physicalDate);
      if (physical > report) {
        issues.push({
          type: "warning",
          field: "physical_date",
          message: "Physical inspection date is after report date. Please verify."
        });
      }
    }

    // Check MSN consistency
    const msn = data.msn;
    if (msn && context.expectedMSN && msn !== context.expectedMSN) {
      issues.push({
        type: "warning",
        field: "msn",
        message: `MSN mismatch. Expected: ${context.expectedMSN}, Entered: ${msn}`
      });
    }

    // Check component counts
    if (context.aircraftType && context.components) {
      const engineCount = context.components.engines || 0;
      const engineFields = Object.keys(data).filter(k => k.includes("engine") && k.includes("serial"));
      if (engineFields.length !== engineCount) {
        issues.push({
          type: "info",
          field: "engines",
          message: `Expected ${engineCount} engine(s). Found ${engineFields.length} engine serial number(s).`
        });
      }
    }

    return issues;
  }

  /**
   * Apply validation to a field element
   */
  applyValidation(fieldElement, fieldDef, context = {}) {
    const validationResult = this.validateField(fieldDef, fieldElement.value, context);
    
    // Remove existing validation classes
    fieldElement.classList.remove("border-red-300", "border-amber-300", "bg-red-50", "bg-amber-50");
    fieldElement.classList.remove("border-green-300", "bg-green-50");

    // Remove existing error messages
    const existingError = fieldElement.parentElement.querySelector(".validation-error");
    if (existingError) {
      existingError.remove();
    }

    const existingSuggestion = fieldElement.parentElement.querySelector(".validation-suggestion");
    if (existingSuggestion) {
      existingSuggestion.remove();
    }

    if (!validationResult.valid) {
      // Show errors
      if (validationResult.errors.length > 0) {
        fieldElement.classList.add("border-red-300", "bg-red-50");
        const errorDiv = document.createElement("div");
        errorDiv.className = "validation-error text-xs text-red-600 mt-1";
        errorDiv.textContent = validationResult.errors[0].message;
        fieldElement.parentElement.appendChild(errorDiv);
      }

      // Show warnings
      if (validationResult.warnings.length > 0) {
        fieldElement.classList.add("border-amber-300", "bg-amber-50");
        const warningDiv = document.createElement("div");
        warningDiv.className = "validation-error text-xs text-amber-600 mt-1";
        warningDiv.textContent = validationResult.warnings[0].message;
        fieldElement.parentElement.appendChild(warningDiv);
      }
    } else {
      // Show success indicator
      fieldElement.classList.add("border-green-300");
    }

    // Show suggestions
    if (validationResult.suggestions.length > 0) {
      const suggestion = validationResult.suggestions[0];
      const suggestionDiv = document.createElement("div");
      suggestionDiv.className = "validation-suggestion text-xs text-slate-500 mt-1 flex items-center gap-2";
      suggestionDiv.innerHTML = `
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>${suggestion.message}</span>
      `;
      fieldElement.parentElement.appendChild(suggestionDiv);
    }

    return validationResult;
  }

  /**
   * Validate entire form
   */
  validateForm(formData, context = {}) {
    const results = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check consistency
    const consistencyIssues = this.checkConsistency(formData, context);
    consistencyIssues.forEach(issue => {
      if (issue.type === "warning") {
        results.warnings.push(issue);
      } else {
        results.suggestions.push(issue);
      }
    });

    if (results.errors.length > 0 || results.warnings.length > 0) {
      results.valid = false;
    }

    return results;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Validation;
}

