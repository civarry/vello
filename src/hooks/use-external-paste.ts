"use client";

import { useEffect, useCallback, useState } from "react";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { Block, DEFAULT_BLOCK_STYLE, DEFAULT_BLOCK_SIZES } from "@/types/template";
import { compressImage } from "@/lib/image-utils";

// Supported image types for PDF rendering
const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg"];

interface UseExternalPasteOptions {
  enabled?: boolean;
}

interface PasteState {
  isPasting: boolean;
  error: string | null;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function useExternalPaste(options: UseExternalPasteOptions = {}) {
  const { enabled = true } = options;
  const [pasteState, setPasteState] = useState<PasteState>({
    isPasting: false,
    error: null,
  });

  const { addBlock, clipboard, paperSize, orientation, zoom } = useTemplateBuilderStore();

  // Upload image to server
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    // Validate file type
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      throw new Error("Only PNG and JPG images are supported for PDF generation");
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Upload failed");
    }

    return result.url;
  }, []);

  // Create an image block from a pasted image
  const createImageBlock = useCallback(
    async (file: File): Promise<Block | null> => {
      // Compress image if needed (handles large clipboard images)
      const compressionResult = await compressImage(file, {
        maxDimension: 2000,
        quality: 0.85,
        maxSizeBeforeCompress: 2 * 1024 * 1024, // Compress if over 2MB
      });
      const processedFile = compressionResult.file;

      // Use dimensions from compression result (already calculated)
      const dimensions = compressionResult.wasCompressed
        ? compressionResult.newDimensions
        : compressionResult.originalDimensions;

      // Fallback if dimensions couldn't be determined
      const finalDimensions = dimensions.width > 0 && dimensions.height > 0
        ? dimensions
        : DEFAULT_BLOCK_SIZES.image;

      const url = await uploadImage(processedFile);
      if (!url) return null;

      // Calculate center position based on paper size
      const PAPER_DIMENSIONS = {
        A4: { width: 210, height: 297 },
        LETTER: { width: 216, height: 279 },
        LEGAL: { width: 216, height: 356 },
      };

      const paperDims = PAPER_DIMENSIONS[paperSize];
      const canvasWidth = orientation === "PORTRAIT" ? paperDims.width : paperDims.height;
      const pxPerMm = 3.78;
      const canvasWidthPx = canvasWidth * pxPerMm;

      // Calculate block dimensions, scaling down if the image is too wide
      // Max width is canvas width minus some padding (e.g. 40px on each side)
      const maxWidth = canvasWidthPx - 80;
      let blockWidth = finalDimensions.width;
      let blockHeight = finalDimensions.height;

      if (blockWidth > maxWidth) {
        const ratio = maxWidth / blockWidth;
        blockWidth = maxWidth;
        blockHeight = finalDimensions.height * ratio;
      }

      // Center horizontally, place near top
      const x = (canvasWidthPx - blockWidth) / 2;
      const y = 50;

      return {
        id: generateId(),
        type: "image",
        properties: {
          src: url,
          alt: file.name || "Pasted image",
          width: "100%",
          height: "auto",
          objectFit: "contain" as const,
        },
        style: {
          ...DEFAULT_BLOCK_STYLE,
          x,
          y,
          width: blockWidth,
          height: blockHeight,
        },
      };
    },
    [uploadImage, paperSize, orientation]
  );

  // Create a text block from pasted text
  const createTextBlock = useCallback(
    (text: string): Block => {
      const sizes = DEFAULT_BLOCK_SIZES.text;

      // Calculate center position based on paper size
      const PAPER_DIMENSIONS = {
        A4: { width: 210, height: 297 },
        LETTER: { width: 216, height: 279 },
        LEGAL: { width: 216, height: 356 },
      };

      const dimensions = PAPER_DIMENSIONS[paperSize];
      const canvasWidth = orientation === "PORTRAIT" ? dimensions.width : dimensions.height;
      const pxPerMm = 3.78;
      const canvasWidthPx = canvasWidth * pxPerMm;

      // Center horizontally, place near top
      const x = (canvasWidthPx - sizes.width) / 2;
      const y = 50;

      // Estimate height based on text length (rough approximation)
      const estimatedHeight = Math.max(sizes.height, Math.ceil(text.length / 30) * 20);

      return {
        id: generateId(),
        type: "text",
        properties: {
          content: text,
          placeholder: "Enter text...",
        },
        style: {
          ...DEFAULT_BLOCK_STYLE,
          x,
          y,
          width: Math.min(sizes.width * 2, canvasWidthPx - 40), // Wider for text
          height: estimatedHeight,
        },
      };
    },
    [paperSize, orientation]
  );

  // Handle paste event
  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      // Skip if not enabled
      if (!enabled) return;

      // Skip if typing in an input/textarea or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Check if we have internal clipboard data - let the internal paste handler work
      if (clipboard && clipboard.length > 0) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      // Look for image files first
      let imageFile: File | null = null;
      let textContent: string | null = null;

      for (const item of Array.from(items)) {
        if (item.kind === "file" && SUPPORTED_IMAGE_TYPES.includes(item.type)) {
          imageFile = item.getAsFile();
          break;
        }
      }

      // If no image, look for text
      if (!imageFile) {
        textContent = e.clipboardData?.getData("text/plain") || null;
      }

      // If we have something to paste, handle it
      if (imageFile || textContent) {
        e.preventDefault();
        setPasteState({ isPasting: true, error: null });

        try {
          if (imageFile) {
            const block = await createImageBlock(imageFile);
            if (block) {
              addBlock(block);
            }
          } else if (textContent && textContent.trim()) {
            const block = createTextBlock(textContent.trim());
            addBlock(block);
          }
          setPasteState({ isPasting: false, error: null });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to paste content";
          setPasteState({ isPasting: false, error: errorMessage });
          console.error("Paste error:", error);
        }
      }
    },
    [enabled, clipboard, createImageBlock, createTextBlock, addBlock]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [enabled, handlePaste]);

  // Clear error after a delay
  useEffect(() => {
    if (pasteState.error) {
      const timer = setTimeout(() => {
        setPasteState((prev) => ({ ...prev, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [pasteState.error]);

  return pasteState;
}
