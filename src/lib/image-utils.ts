/**
 * Client-side image compression utilities
 * Used to compress large images before upload to prevent mobile PDF preview issues
 */

export interface CompressionOptions {
  /** Maximum width or height in pixels (default: 2000) */
  maxDimension?: number;
  /** JPEG quality 0-1 (default: 0.85) */
  quality?: number;
  /** Maximum file size in bytes before compression is applied (default: 2MB) */
  maxSizeBeforeCompress?: number;
}

export interface CompressionResult {
  file: File;
  wasCompressed: boolean;
  originalSize: number;
  newSize: number;
  originalDimensions: { width: number; height: number };
  newDimensions: { width: number; height: number };
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxDimension: 2000,
  quality: 0.85,
  maxSizeBeforeCompress: 2 * 1024 * 1024, // 2MB
};

/**
 * Check if an image needs compression based on dimensions or file size
 */
async function needsCompression(
  file: File,
  dimensions: { width: number; height: number },
  options: Required<CompressionOptions>
): Promise<boolean> {
  // Check file size
  if (file.size > options.maxSizeBeforeCompress) {
    return true;
  }

  // Check dimensions
  if (dimensions.width > options.maxDimension || dimensions.height > options.maxDimension) {
    return true;
  }

  return false;
}

/**
 * Get image dimensions from a File
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for dimension check"));
    };

    img.src = objectUrl;
  });
}

/**
 * Compress an image file if it exceeds size or dimension thresholds
 *
 * @param file - The image file to potentially compress
 * @param options - Compression options
 * @returns CompressionResult with the (potentially compressed) file and metadata
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  // Get original dimensions
  let originalDimensions: { width: number; height: number };
  try {
    originalDimensions = await getImageDimensions(file);
  } catch {
    // If we can't read dimensions, return original file
    return {
      file,
      wasCompressed: false,
      originalSize,
      newSize: originalSize,
      originalDimensions: { width: 0, height: 0 },
      newDimensions: { width: 0, height: 0 },
    };
  }

  // Check if compression is needed
  if (!(await needsCompression(file, originalDimensions, opts))) {
    return {
      file,
      wasCompressed: false,
      originalSize,
      newSize: originalSize,
      originalDimensions,
      newDimensions: originalDimensions,
    };
  }

  // Calculate new dimensions maintaining aspect ratio
  let newWidth = originalDimensions.width;
  let newHeight = originalDimensions.height;

  if (newWidth > opts.maxDimension || newHeight > opts.maxDimension) {
    if (newWidth > newHeight) {
      newHeight = Math.round((newHeight / newWidth) * opts.maxDimension);
      newWidth = opts.maxDimension;
    } else {
      newWidth = Math.round((newWidth / newHeight) * opts.maxDimension);
      newHeight = opts.maxDimension;
    }
  }

  // Compress using canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Draw image scaled to new dimensions
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Determine output format based on original file type
      // Use JPEG for photos (lossy compression), PNG for graphics with transparency
      const isPng = file.type === "image/png";
      const outputType = isPng ? "image/png" : "image/jpeg";
      const quality = isPng ? undefined : opts.quality;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to compress image"));
            return;
          }

          // Create new File with same name
          const compressedFile = new File(
            [blob],
            file.name,
            { type: outputType }
          );

          console.log(
            `[Image Compression] ${file.name}: ${originalSize} -> ${compressedFile.size} bytes ` +
            `(${Math.round((1 - compressedFile.size / originalSize) * 100)}% reduction), ` +
            `${originalDimensions.width}x${originalDimensions.height} -> ${newWidth}x${newHeight}`
          );

          resolve({
            file: compressedFile,
            wasCompressed: true,
            originalSize,
            newSize: compressedFile.size,
            originalDimensions,
            newDimensions: { width: newWidth, height: newHeight },
          });
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image for compression"));
    };

    img.src = objectUrl;
  });
}

/**
 * Convenience function that returns just the compressed file
 */
export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const result = await compressImage(file, options);
  return result.file;
}
