"use client";

import { useState, useCallback } from "react";
import { Block, ImageBlockProperties } from "@/types/template";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { ImageIcon, Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageBlockProps {
  block: Block;
  isPreview?: boolean;
  data?: Record<string, unknown>;
}

export function ImageBlock({ block, isPreview }: ImageBlockProps) {
  const props = block.properties as ImageBlockProperties;
  const { updateBlockProperties } = useTemplateBuilderStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploadError(null);

      // Validate file type - only PNG and JPG are supported for PDF generation
      const supportedTypes = ["image/png", "image/jpeg", "image/jpg"];
      if (!supportedTypes.includes(file.type)) {
        setUploadError("Only PNG and JPG images are supported for PDF generation");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Image must be less than 5MB");
        return;
      }

      setIsUploading(true);

      try {
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

        updateBlockProperties(block.id, { src: result.url });
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [block.id, updateBlockProperties]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isPreview) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleUpload(file);
      } else {
        setUploadError("Please drop an image file");
      }
    },
    [handleUpload, isPreview]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleUpload(file);
      }
    },
    [handleUpload]
  );

  const handleClearImage = useCallback(() => {
    updateBlockProperties(block.id, { src: "" });
  }, [block.id, updateBlockProperties]);

  // If we have an image source, show the image
  if (props.src) {
    return (
      <div className="relative group h-full">
        <img
          src={props.src}
          alt={props.alt || ""}
          style={{
            width: props.width || "100%",
            height: props.height || "100%",
            objectFit: props.objectFit || "contain",
          }}
          className="max-w-full h-full"
        />
        {!isPreview && (
          <button
            onClick={handleClearImage}
            className="absolute top-1 right-1 p-1 rounded bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  // Show upload area in edit mode, placeholder in preview
  if (isPreview) {
    return (
      <div
        className="flex flex-col items-center justify-center border-2 border-dashed rounded-md bg-muted/30 text-muted-foreground h-full"
        style={{ minHeight: "80px" }}
      >
        <ImageIcon className="h-8 w-8 mb-2" />
        <span className="text-xs">No image</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center border-2 border-dashed rounded-md text-muted-foreground h-full transition-colors cursor-pointer",
        isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/30 bg-muted/30 hover:border-muted-foreground/50"
      )}
      style={{ minHeight: "80px" }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isUploading}
      />

      {isUploading ? (
        <>
          <Loader2 className="h-8 w-8 mb-2 animate-spin text-primary" />
          <span className="text-xs">Uploading...</span>
        </>
      ) : (
        <>
          <Upload className="h-8 w-8 mb-2" />
          <span className="text-xs font-medium">Drop image here or click to upload</span>
          <span className="text-xs text-muted-foreground/70 mt-1">
            PNG or JPG only (max 5MB)
          </span>
        </>
      )}

      {uploadError && (
        <div className="absolute bottom-2 left-2 right-2 bg-destructive/10 text-destructive text-xs p-2 rounded">
          {uploadError}
        </div>
      )}
    </div>
  );
}
