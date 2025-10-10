# YouTube Video Feature

This document describes the new YouTube video integration feature added to the LMS system.

## Overview

The LMS now supports two methods for adding videos to chapters:

1. **File Upload**: Upload video files from your device (existing functionality)
2. **YouTube Link**: Paste YouTube video URLs to embed videos directly

## Features

### Video Player
- Uses Plyr for consistent video playback
- Supports both uploaded videos and YouTube embeds (native Plyr YouTube provider)
- Advanced controls with speed options and keyboard shortcuts
- Full-screen support
- Volume control with slider
- Progress bar with seeking
- Keyboard shortcuts
- Picture-in-Picture support
- Compatible with all modern browsers

### YouTube Integration
- Supports multiple YouTube URL formats:
  - `https://www.youtube.com/watch?v=VIDEO_ID`
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `https://www.youtube.com/v/VIDEO_ID`
- Automatic video ID extraction
- URL validation
- Clean embed with minimal branding

### Database Changes
- Added `videoType` field to Chapter model (`"UPLOAD"` or `"YOUTUBE"`)
- Added `youtubeVideoId` field to store extracted YouTube video IDs
- **Removed MuxData model** - no longer using Mux integration
- Existing videos default to `"UPLOAD"` type

## Usage

### For Teachers
1. Navigate to a chapter in your course
2. Click "تعديل الفيديو" (Edit Video)
3. Choose between two tabs:
   - **رفع فيديو** (Upload Video): Drag and drop or select video files
   - **رابط YouTube** (YouTube Link): Paste YouTube URLs
4. For YouTube: Paste the URL and click "إضافة" (Add)

### For Students
- Videos play seamlessly regardless of source
- Consistent player interface for all video types
- Progress tracking works for both video types

## Technical Implementation

### New Components
- `PlyrVideoPlayer`: Custom video player using Video.js for both uploaded and YouTube videos
- `Tabs`: UI component for switching between upload methods

### New API Routes
- `POST /api/courses/[courseId]/chapters/[chapterId]/youtube`: Handle YouTube video uploads
- Updated `POST /api/courses/[courseId]/chapters/[chapterId]/upload`: Simplified to use direct video URLs

### Utility Functions
- `extractYouTubeVideoId()`: Extract video ID from various YouTube URL formats
- `isValidYouTubeUrl()`: Validate YouTube URLs
- `getYouTubeEmbedUrl()`: Generate embed URLs

## Migration
- Database migration `20250804142519_remove_mux_integration` removes MuxData table
- Database migration `20250804140435_add_video_type_and_youtube_support` adds new fields
- Existing videos are automatically set to `"UPLOAD"` type
- No data loss during migration

## Dependencies Added
- `@radix-ui/react-tabs`: For tabbed interface
- `plyr`: For video playback (HTML5 + YouTube)

## Dependencies Removed
- `@mux/mux-node`: No longer using Mux for video processing
- `@mux/mux-player-react`: Replaced with Plyr
- `video.js`: Replaced with Plyr
- `videojs-youtube`: Replaced with Plyr's native YouTube provider

## Browser Support
- Modern browsers with HTML5 video support
- YouTube embed requires JavaScript enabled
- Full-screen API support
- Video.js handles cross-browser compatibility