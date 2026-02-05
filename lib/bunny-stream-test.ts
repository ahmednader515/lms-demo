import axios from 'axios';

const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY || '';
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '';
const BUNNY_STREAM_BASE_URL = 'https://video.bunnycdn.com';

/**
 * Test function to verify Bunny Stream API credentials
 * This can be called from an API route to test the connection
 */
export async function testBunnyStreamCredentials(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Validate environment variables
    if (!BUNNY_STREAM_API_KEY) {
      return {
        success: false,
        message: 'BUNNY_STREAM_API_KEY is not set in environment variables',
      };
    }

    if (!BUNNY_STREAM_LIBRARY_ID) {
      return {
        success: false,
        message: 'BUNNY_STREAM_LIBRARY_ID is not set in environment variables',
      };
    }

    const libraryId = BUNNY_STREAM_LIBRARY_ID.trim().replace(/[^0-9]/g, '');
    
    if (!libraryId) {
      return {
        success: false,
        message: `Invalid BUNNY_STREAM_LIBRARY_ID format: ${BUNNY_STREAM_LIBRARY_ID}. Expected numeric value.`,
      };
    }

    console.log('Testing Bunny Stream API connection...', {
      libraryId,
      apiKeyLength: BUNNY_STREAM_API_KEY.length,
      apiKeyPrefix: BUNNY_STREAM_API_KEY.substring(0, 10) + '...',
    });

    // Test 1: Try to get library information
    try {
      const libraryResponse = await axios.get(
        `${BUNNY_STREAM_BASE_URL}/library/${libraryId}`,
        {
          headers: {
            AccessKey: BUNNY_STREAM_API_KEY,
          },
        }
      );

      return {
        success: true,
        message: 'Bunny Stream API credentials are valid!',
        details: {
          libraryId: libraryResponse.data?.Id || libraryId,
          libraryName: libraryResponse.data?.Name,
          apiKeyValid: true,
        },
      };
    } catch (libraryError: any) {
      if (libraryError.response?.status === 401) {
        return {
          success: false,
          message: 'API Key authentication failed (401). The API key is incorrect or invalid.',
          details: {
            status: 401,
            suggestion: 'Please verify your BUNNY_STREAM_API_KEY in the Bunny.net dashboard under Stream > API Keys',
          },
        };
      } else if (libraryError.response?.status === 404) {
        return {
          success: false,
          message: `Library not found (404). Library ID ${libraryId} does not exist.`,
          details: {
            status: 404,
            libraryId,
            suggestion: 'Please verify your BUNNY_STREAM_LIBRARY_ID in the Bunny.net dashboard',
          },
        };
      }

      // Test 2: Try to list videos (this requires read permissions)
      try {
        const videosResponse = await axios.get(
          `${BUNNY_STREAM_BASE_URL}/library/${libraryId}/videos`,
          {
            headers: {
              AccessKey: BUNNY_STREAM_API_KEY,
            },
            params: {
              page: 1,
              itemsPerPage: 1,
            },
          }
        );

        return {
          success: true,
          message: 'Bunny Stream API credentials are valid and have read permissions!',
          details: {
            libraryId,
            canRead: true,
            videoCount: videosResponse.data?.totalItems || 0,
          },
        };
      } catch (videosError: any) {
        return {
          success: false,
          message: `API connection failed: ${videosError.response?.statusText || videosError.message}`,
          details: {
            libraryError: libraryError.response?.status,
            videosError: videosError.response?.status,
            libraryErrorData: libraryError.response?.data,
            videosErrorData: videosError.response?.data,
          },
        };
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Unexpected error: ${error.message}`,
      details: {
        error: error.toString(),
      },
    };
  }
}

