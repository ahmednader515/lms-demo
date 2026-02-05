# Bunny Stream Video Player with DRM Implementation

This document describes the complete implementation of Bunny.net video streaming with DRM protection, replacing the previous Plyr-based video player for uploaded videos.

## Overview

The LMS now supports three video types:
1. **Bunny Stream (DRM Protected)** - New default for secure video streaming
2. **Upload** - Direct file uploads (legacy)
3. **YouTube** - YouTube video embeds

## Implementation Details

### 1. Database Schema Updates

Added two new fields to the `Chapter` model:
- `bunnyStreamVideoId`: Stores the Bunny Stream video GUID
- `bunnyStreamLibraryId`: Stores the Bunny Stream library ID

The `videoType` field now supports `"BUNNY_STREAM"` as a value.

### 2. Environment Variables

Required environment variables in `.env`:
```env
BUNNY_STREAM_API_KEY=your_api_key_here
BUNNY_STREAM_LIBRARY_ID=your_library_id_here
BUNNY_STREAM_DRM_SECRET=your_drm_secret_here  # Optional, defaults to API key
```

### 3. New Components

#### `components/bunny-stream-player.tsx`
- Custom React component for Bunny Stream video playback
- Supports DRM token authentication
- Handles iframe embedding with message passing for player events
- Responsive design with aspect ratio preservation

#### `lib/bunny-stream.ts`
Utility functions for Bunny Stream integration:
- `uploadVideoToBunnyStream()`: Uploads video files to Bunny Stream
- `getBunnyStreamVideo()`: Retrieves video metadata
- `generateDRMToken()`: Creates JWT tokens for DRM protection
- `verifyDRMToken()`: Validates DRM tokens
- `getBunnyStreamEmbedUrl()`: Generates embed URLs
- `deleteBunnyStreamVideo()`: Removes videos from Bunny Stream

### 4. Updated Components

#### `components/plyr-video-player.tsx`
- Added support for `BUNNY_STREAM` video type
- Automatically uses `BunnyStreamPlayer` for Bunny Stream videos
- Maintains backward compatibility with YouTube and Upload types

#### `app/dashboard/(routes)/teacher/courses/[courseId]/chapters/[chapterId]/_components/video-form.tsx`
- Added new "Bunny Stream (DRM)" tab as the default option
- Direct file upload to Bunny Stream API
- Shows upload progress and status

#### `app/(course)/courses/[courseId]/chapters/[chapterId]/page.tsx`
- Fetches DRM tokens for authenticated users
- Passes tokens to video player component
- Handles access control for DRM-protected videos

### 5. API Endpoints

#### `POST /api/courses/[courseId]/chapters/[chapterId]/bunny-stream`
- Handles video file uploads to Bunny Stream
- Creates video entry and uploads file
- Updates chapter with Bunny Stream video IDs
- Returns video ID and library ID

#### `GET /api/courses/[courseId]/chapters/[chapterId]/video-token`
- Generates DRM tokens for authenticated users
- Validates user access (purchase, free chapter, or course owner)
- Returns JWT token with 1-hour expiry
- Only works for Bunny Stream videos

### 6. Security Features

- **DRM Protection**: Videos are protected with JWT tokens
- **Access Control**: Tokens are only generated for users with course access
- **Token Expiry**: Tokens expire after 1 hour for security
- **User Validation**: Server-side validation of user permissions

## Usage

### For Teachers

1. Navigate to a chapter in your course
2. Click "تعديل الفيديو" (Edit Video)
3. Select the "Bunny Stream (DRM)" tab (default)
4. Click "اختر ملف فيديو" (Choose Video File)
5. Select your video file
6. The video will be uploaded to Bunny Stream automatically
7. After upload, Bunny Stream will encode the video (may take a few minutes)

### For Students

- Videos play automatically with DRM protection
- Tokens are fetched and validated server-side
- Only users with course access can view videos
- Videos are streamed from Bunny.net CDN for optimal performance

## Technical Notes

### Video Upload Process

1. Teacher selects video file
2. File is sent to `/api/courses/[courseId]/chapters/[chapterId]/bunny-stream`
3. API creates video entry in Bunny Stream
4. Video file is uploaded to Bunny Stream
5. Chapter is updated with video IDs
6. Bunny Stream automatically encodes the video

### DRM Token Flow

1. Student accesses chapter with Bunny Stream video
2. Frontend checks if user has access
3. If access granted, requests token from `/api/courses/[courseId]/chapters/[chapterId]/video-token`
4. Backend validates access and generates JWT token
5. Token is passed to `BunnyStreamPlayer` component
6. Player embeds video with token in URL
7. Bunny Stream validates token and serves video

### Token Structure

```json
{
  "videoId": "video-guid",
  "libraryId": "library-id",
  "userId": "user-id",
  "exp": 1234567890,
  "iat": 1234567890
}
```

## Configuration

### Bunny.net Dashboard Settings

1. **Enable DRM**: Go to your Bunny Stream library → Security & Delivery → Enable DRM
2. **Configure Token Signing**: Set up JWT secret key (use `BUNNY_STREAM_DRM_SECRET`)
3. **Set Delivery Tiers**: Configure encoding and quality settings
4. **Geo-Replication**: Enable only in regions where you have users

## Migration Notes

- Existing videos with `videoType="UPLOAD"` will continue to work
- YouTube videos are unaffected
- New videos default to Bunny Stream when uploaded via the new tab
- Database migration adds new fields without affecting existing data

## Troubleshooting

### Videos Not Playing
- Check that DRM is enabled in Bunny.net dashboard
- Verify environment variables are set correctly
- Check browser console for errors
- Ensure user has access to the course

### Upload Failures
- Check file size limits (Bunny Stream supports large files)
- Verify API key has upload permissions
- Check network connectivity
- Review server logs for detailed errors

### Token Issues
- Verify `BUNNY_STREAM_DRM_SECRET` matches Bunny.net configuration
- Check token expiry (default 1 hour)
- Ensure user has course access
- Review API endpoint logs

## Benefits

1. **Security**: DRM protection prevents unauthorized video access
2. **Performance**: Global CDN for fast video delivery
3. **Scalability**: Bunny Stream handles encoding and delivery
4. **Cost-Effective**: Pay only for bandwidth used
5. **Quality**: Automatic encoding to multiple resolutions
6. **Analytics**: Built-in video analytics in Bunny.net dashboard

## Next Steps

1. Monitor video upload and playback in production
2. Review Bunny.net analytics for usage patterns
3. Optimize encoding settings based on content type
4. Consider implementing video thumbnails
5. Add video quality selection UI if needed

