import axios from 'axios';
import jwt from 'jsonwebtoken';

const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY || '';
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '';
const BUNNY_STREAM_BASE_URL = 'https://video.bunnycdn.com';
const BUNNY_STREAM_DRM_SECRET = process.env.BUNNY_STREAM_DRM_SECRET || BUNNY_STREAM_API_KEY; // Use API key as fallback

// Validate library ID format (should be numeric)
function getLibraryId(): string {
  const libId = BUNNY_STREAM_LIBRARY_ID.trim();
  if (!libId) {
    throw new Error('BUNNY_STREAM_LIBRARY_ID is not set in environment variables');
  }
  // Remove any non-numeric characters (in case it's formatted with dashes or spaces)
  const numericId = libId.replace(/[^0-9]/g, '');
  if (!numericId) {
    throw new Error(`Invalid BUNNY_STREAM_LIBRARY_ID format: ${libId}. Expected numeric value.`);
  }
  return numericId;
}

interface BunnyStreamVideo {
  videoLibraryId: number;
  guid: string;
  title: string;
  dateUploaded: string;
  views: number;
  isPublic: boolean;
  length: number;
  status: number;
  framerate: number;
  rotation: number;
  width: number;
  height: number;
  availableResolutions: string;
  thumbnailCount: number;
  encodeProgress: number;
  storageSize: number;
  captions: any[];
  chapters: any[];
  moments: any[];
  metaTags: any[];
  transcodingMessages: any[];
}

/**
 * Upload video to Bunny Stream
 */
export async function uploadVideoToBunnyStream(
  videoFile: File | Buffer,
  title: string
): Promise<{ videoId: string; libraryId: string }> {
  try {
    // Validate environment variables
    if (!BUNNY_STREAM_API_KEY) {
      throw new Error('BUNNY_STREAM_API_KEY is not set in environment variables');
    }
    
    const libraryId = getLibraryId();

    console.log('Creating video entry in Bunny Stream...', {
      libraryId: libraryId,
      title: title.substring(0, 50),
      apiKeySet: !!BUNNY_STREAM_API_KEY,
    });

    // First, create the video entry
    const createUrl = `${BUNNY_STREAM_BASE_URL}/library/${libraryId}/videos`;
    const createResponse = await axios.post(
      createUrl,
      {
        title: title,
      },
      {
        headers: {
          AccessKey: BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!createResponse.data || !createResponse.data.guid) {
      console.error('Bunny Stream create response:', createResponse.data);
      throw new Error('Invalid response from Bunny Stream: missing video GUID');
    }

    const videoId = createResponse.data.guid;
    const responseLibraryId = createResponse.data.videoLibraryId?.toString() || libraryId;

    console.log('Video entry created:', { videoId, libraryId });

    // Then upload the video file
    let fileBuffer: Buffer;
    if (videoFile instanceof File) {
      const arrayBuffer = await videoFile.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      fileBuffer = videoFile;
    }

    console.log('Uploading video file...', {
      videoId,
      libraryId: responseLibraryId,
      fileSize: fileBuffer.length,
    });

    const uploadUrl = `${BUNNY_STREAM_BASE_URL}/library/${libraryId}/videos/${videoId}`;
    await axios.put(
      uploadUrl,
      fileBuffer,
      {
        headers: {
          AccessKey: BUNNY_STREAM_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    console.log('Video uploaded successfully:', { videoId, libraryId: responseLibraryId });
    return { videoId, libraryId: responseLibraryId };
  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
    };
    console.error('Bunny Stream upload error:', errorDetails);
    
    // Provide more specific error messages
    if (error.response?.status === 404) {
      const attemptedUrl = error.config?.url || 'unknown';
      throw new Error(
        `Bunny Stream API endpoint not found (404). ` +
        `URL: ${attemptedUrl}. ` +
        `Please verify BUNNY_STREAM_LIBRARY_ID is correct. ` +
        `Current value: ${BUNNY_STREAM_LIBRARY_ID || 'not set'}`
      );
    } else if (error.response?.status === 401) {
      throw new Error(
        'Bunny Stream API authentication failed (401). ' +
        'Please verify BUNNY_STREAM_API_KEY is correct and has upload permissions.'
      );
    } else if (error.response?.status === 400) {
      const errorData = error.response?.data;
      throw new Error(
        `Bunny Stream API error (400): ${JSON.stringify(errorData || error.message)}`
      );
    }
    
    throw new Error(`Failed to upload video to Bunny Stream: ${error.message}`);
  }
}

/**
 * Get video details from Bunny Stream
 */
export async function getBunnyStreamVideo(videoId: string): Promise<BunnyStreamVideo> {
  try {
    const response = await axios.get(
      `${BUNNY_STREAM_BASE_URL}/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          AccessKey: BUNNY_STREAM_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error('Bunny Stream get video error:', error.response?.data || error.message);
    throw new Error('Failed to get video from Bunny Stream');
  }
}

/**
 * Generate DRM token for secure video playback
 * Uses JWT to sign the token with user and video information
 */
export function generateDRMToken(
  videoId: string,
  libraryId: string,
  userId: string,
  expiresIn: number = 3600 // 1 hour default
): string {
  const payload = {
    videoId,
    libraryId,
    userId,
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iat: Math.floor(Date.now() / 1000),
  };

  // Sign the token with the DRM secret
  const token = jwt.sign(payload, BUNNY_STREAM_DRM_SECRET, {
    algorithm: 'HS256',
  });

  return token;
}

/**
 * Verify DRM token
 */
export function verifyDRMToken(token: string): { videoId: string; libraryId: string; userId: string } | null {
  try {
    const decoded = jwt.verify(token, BUNNY_STREAM_DRM_SECRET) as any;
    return {
      videoId: decoded.videoId,
      libraryId: decoded.libraryId,
      userId: decoded.userId,
    };
  } catch (error) {
    console.error('DRM token verification failed:', error);
    return null;
  }
}

/**
 * Get video embed URL with DRM protection
 */
export function getBunnyStreamEmbedUrl(
  videoId: string,
  libraryId: string,
  token?: string
): string {
  const baseUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
  if (token) {
    return `${baseUrl}?token=${token}`;
  }
  return baseUrl;
}

/**
 * Delete video from Bunny Stream
 */
export async function deleteBunnyStreamVideo(videoId: string): Promise<void> {
  try {
    await axios.delete(
      `${BUNNY_STREAM_BASE_URL}/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          AccessKey: BUNNY_STREAM_API_KEY,
        },
      }
    );
  } catch (error: any) {
    console.error('Bunny Stream delete error:', error.response?.data || error.message);
    throw new Error('Failed to delete video from Bunny Stream');
  }
}

