# Bunny Stream API Key Setup Guide

## Step 1: Get Your Stream API Key

1. Log in to [Bunny.net Dashboard](https://bunny.net)
2. Navigate to **Stream** → **API Keys** (or **Account** → **API Keys**)
3. Find your **Stream API Key** (NOT the CDN API key)
4. Copy the API key

## Step 2: Get Your Library ID

1. In Bunny.net Dashboard, go to **Stream** → **Libraries**
2. Click on your video library
3. The Library ID is shown in the library details (it's a numeric value, e.g., `12345`)
4. Copy the Library ID

## Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Bunny Stream Configuration
BUNNY_STREAM_API_KEY=your_stream_api_key_here
BUNNY_STREAM_LIBRARY_ID=your_library_id_here

# Optional: DRM Secret (defaults to API key if not set)
BUNNY_STREAM_DRM_SECRET=your_drm_secret_here
```

**Important Notes:**
- Use the **Stream API Key**, not the CDN API key
- Library ID should be numeric only (e.g., `12345`, not `lib-12345`)
- No quotes needed around the values
- Restart your dev server after changing `.env` file

## Step 4: Test Your Configuration

1. Start your dev server
2. Visit: `http://localhost:3000/api/test-bunny-stream`
3. Check the response:
   - ✅ Success: Your credentials are correct!
   - ❌ 401 Error: API key is incorrect or doesn't have permissions
   - ❌ 404 Error: Library ID is incorrect

## Step 5: Verify API Key Permissions

In Bunny.net Dashboard:
1. Go to **Stream** → **API Keys**
2. Click on your API key
3. Ensure these permissions are enabled:
   - ✅ **Read Videos** (required for listing videos)
   - ✅ **Create Videos** (required for uploading)
   - ✅ **Update Videos** (required for uploading video files)
   - ✅ **Delete Videos** (optional, for cleanup)

## Common Issues

### 401 Authentication Failed
- **Cause**: Wrong API key or missing permissions
- **Solution**: 
  - Verify you're using the Stream API key (not CDN key)
  - Check API key permissions in dashboard
  - Regenerate API key if needed

### 404 Library Not Found
- **Cause**: Wrong Library ID
- **Solution**:
  - Verify Library ID in Stream → Libraries
  - Ensure it's numeric only (remove any prefixes like "lib-")

### API Key Not Working
- **Cause**: Using CDN API key instead of Stream API key
- **Solution**: Get the correct Stream API key from Stream → API Keys

## Testing Upload

After verifying credentials:
1. Go to your course chapter edit page
2. Click "تعديل الفيديو" (Edit Video)
3. Select "Bunny Stream (DRM)" tab
4. Upload a test video
5. Check server logs for detailed error messages if it fails

