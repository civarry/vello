/**
 * Draft management for template builder
 * Automatically saves work to localStorage to prevent data loss
 */

import type { Block, GlobalStyles, Guide } from "@/types/template";
import type { PaperSize, Orientation } from "@/stores/template-builder-store";

const DRAFT_PREFIX = "vello_template_draft_";
const DRAFT_EXPIRY_HOURS = 24; // Drafts expire after 24 hours

export interface TemplateDraft {
  templateId: string;
  templateName: string;
  blocks: Block[];
  globalStyles: GlobalStyles;
  paperSize: PaperSize;
  orientation: Orientation;
  guides: Guide[];
  savedAt: number; // Unix timestamp
}

/**
 * Get the localStorage key for a template draft
 */
function getDraftKey(templateId: string): string {
  return `${DRAFT_PREFIX}${templateId}`;
}

/**
 * Save a template draft to localStorage
 */
export function saveDraft(draft: Omit<TemplateDraft, "savedAt">): void {
  if (!draft.templateId || typeof window === "undefined") return;

  try {
    const draftWithTimestamp: TemplateDraft = {
      ...draft,
      savedAt: Date.now(),
    };
    localStorage.setItem(
      getDraftKey(draft.templateId),
      JSON.stringify(draftWithTimestamp)
    );
  } catch (error) {
    // localStorage might be full or disabled
    console.warn("Failed to save draft:", error);
  }
}

/**
 * Load a template draft from localStorage
 * Returns null if no draft exists or if it's expired
 */
export function loadDraft(templateId: string): TemplateDraft | null {
  if (!templateId || typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(getDraftKey(templateId));
    if (!stored) return null;

    const draft: TemplateDraft = JSON.parse(stored);

    // Check if draft has expired
    const expiryTime = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000;
    if (Date.now() - draft.savedAt > expiryTime) {
      clearDraft(templateId);
      return null;
    }

    return draft;
  } catch (error) {
    console.warn("Failed to load draft:", error);
    return null;
  }
}

/**
 * Clear a template draft from localStorage
 */
export function clearDraft(templateId: string): void {
  if (!templateId || typeof window === "undefined") return;

  try {
    localStorage.removeItem(getDraftKey(templateId));
  } catch (error) {
    console.warn("Failed to clear draft:", error);
  }
}

/**
 * Check if a draft exists and is newer than the provided timestamp
 */
export function hasDraft(templateId: string): boolean {
  const draft = loadDraft(templateId);
  return draft !== null;
}

/**
 * Get the time since the draft was saved (human readable)
 */
export function getDraftAge(draft: TemplateDraft): string {
  const seconds = Math.floor((Date.now() - draft.savedAt) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Debounce helper for auto-save
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
