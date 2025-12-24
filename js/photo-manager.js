/**
 * Photo Manager - Handles multiple photo capture, preview, delete, and location-based reminders
 */

class PhotoManager {
  constructor(projectId, locationId, storageKey = "dae_inspection_photos") {
    this.projectId = projectId;
    this.locationId = locationId;
    this.storageKey = storageKey;
    this.photos = this.loadPhotos();
    this.maxPhotos = 50; // Reasonable limit
  }

  loadPhotos() {
    try {
      const key = `${this.storageKey}_${this.projectId}_${this.locationId}`;
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error loading photos:", e);
      return [];
    }
  }

  savePhotos() {
    try {
      const key = `${this.storageKey}_${this.projectId}_${this.locationId}`;
      localStorage.setItem(key, JSON.stringify(this.photos));
      return true;
    } catch (e) {
      console.error("Error saving photos:", e);
      // Handle quota exceeded
      if (e.name === "QuotaExceededError") {
        alert("Storage limit reached. Please delete some photos or contact support.");
      }
      return false;
    }
  }

  /**
   * Add multiple photos from file input
   */
  async addPhotos(files) {
    if (!files || files.length === 0) return [];

    const newPhotos = [];
    const remaining = this.maxPhotos - this.photos.length;

    if (remaining <= 0) {
      alert(`Maximum ${this.maxPhotos} photos allowed. Please delete some photos first.`);
      return [];
    }

    const filesToProcess = Array.from(files).slice(0, remaining);

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        continue; // Skip non-image files
      }

      try {
        const photoData = await this.fileToBase64(file);
        const photo = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          data: photoData,
          filename: file.name,
          timestamp: new Date().toISOString(),
          size: file.size
        };
        newPhotos.push(photo);
      } catch (e) {
        console.error("Error processing photo:", e);
      }
    }

    this.photos.push(...newPhotos);
    this.savePhotos();
    return newPhotos;
  }

  /**
   * Convert file to base64 for storage
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Store as data URL
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Delete a photo by ID
   */
  deletePhoto(photoId) {
    const index = this.photos.findIndex(p => p.id === photoId);
    if (index !== -1) {
      this.photos.splice(index, 1);
      this.savePhotos();
      return true;
    }
    return false;
  }

  /**
   * Get all photos
   */
  getAllPhotos() {
    return [...this.photos];
  }

  /**
   * Get photo count
   */
  getCount() {
    return this.photos.length;
  }

  /**
   * Clear all photos
   */
  clear() {
    this.photos = [];
    this.savePhotos();
  }

  /**
   * Create photo input element with multiple capture
   */
  createPhotoInput(container, onPhotosAdded) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.capture = "environment"; // Use rear camera on mobile if available
    input.className = "hidden";
    input.id = `photo-input-${this.locationId}`;

    input.addEventListener("change", async (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const newPhotos = await this.addPhotos(files);
        if (onPhotosAdded) {
          onPhotosAdded(newPhotos);
        }
        // Reset input to allow selecting same files again
        input.value = "";
      }
    });

    container.appendChild(input);
    return input;
  }

  /**
   * Create photo capture button
   */
  createCaptureButton(container, input) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 active:bg-slate-700";
    button.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      <span>Take Photos</span>
    `;
    button.addEventListener("click", () => {
      input.click();
    });
    return button;
  }

  /**
   * Create photo grid with preview and delete
   */
  createPhotoGrid(container, onUpdate) {
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4";
    grid.id = `photo-grid-${this.locationId}`;

    this.updatePhotoGrid(grid, onUpdate);
    return grid;
  }

  /**
   * Update photo grid display
   */
  updatePhotoGrid(grid, onUpdate) {
    grid.innerHTML = "";

    if (this.photos.length === 0) {
      const empty = document.createElement("div");
      empty.className = "col-span-full text-center text-xs text-slate-500 py-8";
      empty.textContent = "No photos yet";
      grid.appendChild(empty);
      return;
    }

    this.photos.forEach((photo, index) => {
      const photoCard = document.createElement("div");
      photoCard.className = "relative group rounded-md border border-slate-200 bg-white overflow-hidden";
      
      const img = document.createElement("img");
      img.src = photo.data;
      img.alt = `Photo ${index + 1}`;
      img.className = "w-full h-32 md:h-40 object-cover";
      img.loading = "lazy";

      const overlay = document.createElement("div");
      overlay.className = "absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700 active:bg-red-800";
      deleteBtn.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      `;
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Delete this photo?")) {
          this.deletePhoto(photo.id);
          this.updatePhotoGrid(grid, onUpdate);
          if (onUpdate) onUpdate();
        }
      });

      overlay.appendChild(deleteBtn);

      const info = document.createElement("div");
      info.className = "absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-2 py-1";
      info.textContent = `#${index + 1}`;

      photoCard.appendChild(img);
      photoCard.appendChild(overlay);
      photoCard.appendChild(info);

      // Click to view full size
      photoCard.addEventListener("click", () => {
        this.showPhotoModal(photo, index);
      });

      grid.appendChild(photoCard);
    });
  }

  /**
   * Show photo in modal for full view
   */
  showPhotoModal(photo, index) {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="relative max-w-4xl w-full">
        <button class="absolute top-4 right-4 text-white hover:text-slate-300 z-10" id="closePhotoModal">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <img src="${photo.data}" alt="Photo ${index + 1}" class="max-h-[90vh] w-auto mx-auto rounded-lg">
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
          Photo ${index + 1} of ${this.photos.length}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector("#closePhotoModal");
    closeBtn.addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * Create photo reminder badge
   */
  createPhotoReminder(requiredCount, description) {
    const reminder = document.createElement("div");
    reminder.className = "rounded-md border border-amber-200 bg-amber-50 p-2.5 mb-3";
    reminder.innerHTML = `
      <div class="flex items-start gap-2">
        <svg class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="flex-1">
          <div class="text-xs font-semibold text-amber-900">Photo Required</div>
          <div class="text-xs text-amber-700 mt-0.5">
            ${description || `Please take ${requiredCount} photo(s) for this location`}
          </div>
          <div class="text-xs text-amber-600 mt-0.5">
            Current: ${this.getCount()} / ${requiredCount} required
          </div>
        </div>
      </div>
    `;
    return reminder;
  }

  /**
   * Check if photo requirements are met
   */
  checkRequirements(requiredCount) {
    return {
      met: this.getCount() >= requiredCount,
      count: this.getCount(),
      required: requiredCount,
      remaining: Math.max(0, requiredCount - this.getCount())
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PhotoManager;
}

