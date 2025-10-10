import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely parses quiz options from JSON string or comma-separated string
 * @param options - The options string to parse
 * @returns Array of options or empty array if parsing fails
 */
export function parseQuizOptions(options: string | null): string[] {
  if (!options) return [];
  
  // Ensure options is a string
  if (typeof options !== 'string') {
    console.warn("parseQuizOptions received non-string input:", options);
    return [];
  }
  
  // Remove any leading/trailing whitespace
  const trimmedOptions = options.trim();
  if (!trimmedOptions) return [];
  
  try {
    // First, try to parse as JSON
    const parsed = JSON.parse(trimmedOptions);
    
    // If it's already an array, return it
    if (Array.isArray(parsed)) {
      return parsed.filter(option => typeof option === 'string' && option.trim().length > 0);
    }
    
    // If it's a string that looks like an array, try to parse it
    if (typeof parsed === 'string') {
      try {
        const innerParsed = JSON.parse(parsed);
        if (Array.isArray(innerParsed)) {
          return innerParsed.filter(option => typeof option === 'string' && option.trim().length > 0);
        }
      } catch {
        // If inner parsing fails, treat as comma-separated
        // Remove brackets and quotes, then split by comma
        const cleaned = parsed.replace(/^\[|\]$/g, '').replace(/"/g, '');
        return cleaned.split(',').map(option => option.trim()).filter(option => option.length > 0);
      }
    }
    
    return [];
  } catch (jsonError) {
    // If JSON parsing fails, try to handle as comma-separated string
    try {
      // Remove any quotes and brackets that might be present
      const cleanedOptions = trimmedOptions
        .replace(/^\[|\]$/g, '') // Remove outer brackets
        .replace(/^"|"$/g, '') // Remove outer quotes
        .replace(/"/g, ''); // Remove all inner quotes
      
      // Split by comma and clean up each option
      const optionsArray = cleanedOptions
        .split(',')
        .map(option => option.trim())
        .filter(option => option.length > 0);
      
      return optionsArray;
    } catch (splitError) {
      console.error("Error parsing quiz options:", { original: options, jsonError, splitError });
      return [];
    }
  }
}

/**
 * Safely stringifies quiz options for storage
 * @param options - Array of options to stringify
 * @returns JSON string or null if empty
 */
export function stringifyQuizOptions(options: string[]): string | null {
  if (!options || !Array.isArray(options) || options.length === 0) {
    return null;
  }
  
  // Filter out empty options and trim whitespace
  const cleanOptions = options
    .filter(option => typeof option === 'string' && option.trim().length > 0)
    .map(option => option.trim());
  
  if (cleanOptions.length === 0) {
    return null;
  }
  
  return JSON.stringify(cleanOptions);
}

/**
 * Validates quiz options format
 * @param options - The options to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateQuizOptions(options: string[]): { isValid: boolean; error?: string } {
  if (!Array.isArray(options)) {
    return { isValid: false, error: "Options must be an array" };
  }
  
  if (options.length === 0) {
    return { isValid: false, error: "At least one option is required" };
  }
  
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (typeof option !== 'string') {
      return { isValid: false, error: `Option ${i + 1} must be a string` };
    }
    
    if (option.trim().length === 0) {
      return { isValid: false, error: `Option ${i + 1} cannot be empty` };
    }
    
    if (option.length > 500) {
      return { isValid: false, error: `Option ${i + 1} is too long (max 500 characters)` };
    }
  }
  
  return { isValid: true };
}

/**
 * Get the appropriate dashboard URL based on user role
 * @param role - The user's role
 * @returns The dashboard URL for the user's role
 */
export function getDashboardUrlByRole(role: string): string {
  console.log("🔍 getDashboardUrlByRole called with role:", role);
  
  let dashboardUrl: string;
  switch (role) {
    case "TEACHER":
      dashboardUrl = "/dashboard/teacher/courses";
      break;
    case "ADMIN":
      dashboardUrl = "/dashboard/admin/users";
      break;
    case "USER":
    default:
      dashboardUrl = "/dashboard";
      break;
  }
  
  console.log("🔍 Redirecting to dashboard URL:", dashboardUrl);
  return dashboardUrl;
}
