/**
 * CDN Utility Functions
 * Converts local static asset paths to bunny.net CDN URLs
 */

const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://ahmednader.b-cdn.net';

/**
 * Converts a local static asset path to a CDN URL
 * @param path - Local path starting with '/' (e.g., '/logo.png')
 * @returns Full CDN URL (e.g., 'https://ahmednader.b-cdn.net/logo.png')
 */
export function getCdnUrl(path: string): string {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Return CDN URL
  return `${CDN_BASE_URL}/${cleanPath}`;
}

/**
 * Checks if a URL is already a full URL (starts with http:// or https://)
 * @param url - URL to check
 * @returns true if it's already a full URL
 */
export function isFullUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Gets the CDN URL for an asset, or returns the original URL if it's already a full URL
 * @param path - Local path or full URL
 * @returns CDN URL or original URL
 */
export function getAssetUrl(path: string): string {
  // If it's already a full URL (like external images), return as is
  if (isFullUrl(path)) {
    return path;
  }
  
  // Convert local path to CDN URL
  return getCdnUrl(path);
}

