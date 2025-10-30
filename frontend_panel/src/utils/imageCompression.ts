/**
 * Image compression utility for localStorage optimization
 * Reduces photo file sizes while maintaining reasonable quality
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  maxSizeMB: 0.3 // Target 300KB max per photo
};

/**
 * Compresses an image to reduce file size
 * @param dataUrl - Base64 data URL of the image
 * @param options - Compression options
 * @returns Compressed base64 data URL
 */
export async function compressImage(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Use better image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels until we hit target size
        let quality = opts.quality;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        
        // If still too large, reduce quality iteratively
        const targetBytes = opts.maxSizeMB * 1024 * 1024;
        while (quality > 0.3 && compressed.length > targetBytes * 1.37) { // 1.37 = base64 overhead
          quality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(compressed);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * Compresses multiple images
 * @param dataUrls - Array of base64 data URLs
 * @param options - Compression options
 * @returns Array of compressed base64 data URLs
 */
export async function compressImages(
  dataUrls: string[],
  options: CompressionOptions = {}
): Promise<string[]> {
  return Promise.all(dataUrls.map(url => compressImage(url, options)));
}

/**
 * Gets the size of a base64 data URL in bytes
 * @param dataUrl - Base64 data URL
 * @returns Size in bytes
 */
export function getDataUrlSize(dataUrl: string): number {
  // Remove data URL prefix to get pure base64
  const base64 = dataUrl.split(',')[1] || dataUrl;
  // Each base64 character represents 6 bits, so divide by 1.37 to get actual size
  return Math.round((base64.length * 3) / 4);
}

/**
 * Gets the size of a base64 data URL in MB
 * @param dataUrl - Base64 data URL
 * @returns Size in MB
 */
export function getDataUrlSizeMB(dataUrl: string): number {
  return getDataUrlSize(dataUrl) / (1024 * 1024);
}

/**
 * Formats bytes to human-readable string
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
