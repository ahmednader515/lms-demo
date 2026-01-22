# Bunny.net CDN Implementation

This document describes the CDN integration with bunny.net for serving static assets.

## Overview

All static assets (images) are now served through the bunny.net CDN at `https://ahmednader.b-cdn.net` instead of being served directly from the application server.

## Implementation Details

### 1. CDN Utility Functions (`lib/cdn.ts`)

Created utility functions to handle CDN URL conversion:

- `getCdnUrl(path: string)`: Converts a local path (e.g., `/logo.png`) to a CDN URL
- `getAssetUrl(path: string)`: Handles both local paths and full URLs (useful for course images that might be external)
- `isFullUrl(url: string)`: Checks if a URL is already a full URL

### 2. Next.js Configuration (`next.config.js`)

Added `ahmednader.b-cdn.net` to the allowed image domains in Next.js image optimization configuration.

### 3. Updated Components

All static image references have been updated to use CDN URLs:

- **Homepage** (`app/page.tsx`): Teacher image, pencil, eraser, ruler, male avatar
- **Navbar** (`components/navbar.tsx`): Logo
- **Dashboard Logo** (`app/dashboard/_components/logo.tsx`): Logo
- **Auth Pages**: Sign-in and Sign-up pages logo
- **Icon** (`app/icon.tsx`): Favicon/icon generation
- **Dashboard Pages**: Course images and placeholders
- **Search Pages**: Course images and user avatars

## Environment Variables

The CDN URL can be configured via environment variable:

```env
NEXT_PUBLIC_CDN_URL=https://ahmednader.b-cdn.net
```

If not set, it defaults to `https://ahmednader.b-cdn.net`.

## Usage Examples

### For Static Assets

```tsx
import { getCdnUrl } from "@/lib/cdn";
import Image from "next/image";

<Image
  src={getCdnUrl("/logo.png")}
  alt="Logo"
  width={100}
  height={100}
/>
```

### For Dynamic/Course Images

```tsx
import { getAssetUrl, getCdnUrl } from "@/lib/cdn";
import Image from "next/image";

// Course images might be external URLs or local paths
<Image
  src={course.imageUrl ? getAssetUrl(course.imageUrl) : getCdnUrl("/placeholder.png")}
  alt={course.title}
  fill
/>
```

## Fonts

Fonts are handled by Next.js's built-in font optimization system and don't need CDN integration. They are automatically optimized and bundled with the application.

## Next Steps

1. **Upload Assets to CDN**: Ensure all static assets from the `public/` folder are uploaded to your bunny.net pull zone
2. **Configure Pull Zone**: Set up your bunny.net pull zone to pull from your application's domain
3. **Test**: Verify that all images load correctly from the CDN
4. **Monitor**: Check CDN performance and caching settings

## Assets That Need to be on CDN

Make sure these files are accessible via `https://ahmednader.b-cdn.net/`:

- `/logo.png`
- `/teacher-image.png`
- `/pencil.png`
- `/eraser.png`
- `/ruler.png`
- `/male.png`
- `/placeholder.png` (if used as fallback)

## Notes

- The CDN implementation preserves backward compatibility - if an asset URL is already a full URL (external), it will be used as-is
- Next.js Image component optimization still works with CDN URLs
- All image references have been updated, but make sure the actual files are available on the CDN

