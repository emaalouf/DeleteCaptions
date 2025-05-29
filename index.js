import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL || "https://ws.api.video";

// Validate that API_KEY is provided
if (!API_KEY) {
  console.error("❌ API_KEY is required. Please set it in your .env file.");
  process.exit(1);
}

class ApiVideoCaptionDeleter {
  constructor() {
    this.accessToken = null;
    this.rateLimitInfo = {
      limit: null,
      remaining: null,
      resetTime: null
    };
  }

  // Helper method to parse rate limit headers
  parseRateLimitHeaders(response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const retryAfter = response.headers.get('X-RateLimit-Retry-After');
    
    if (limit) this.rateLimitInfo.limit = parseInt(limit);
    if (remaining) this.rateLimitInfo.remaining = parseInt(remaining);
    if (retryAfter) this.rateLimitInfo.resetTime = Date.now() + (parseInt(retryAfter) * 1000);
    
    return {
      limit: this.rateLimitInfo.limit,
      remaining: this.rateLimitInfo.remaining,
      retryAfter: retryAfter ? parseInt(retryAfter) : null
    };
  }

  // Enhanced fetch with rate limiting and retry logic
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Parse rate limit headers
        const rateLimitInfo = this.parseRateLimitHeaders(response);
        
        // Log rate limit info occasionally
        if (rateLimitInfo.remaining !== null && rateLimitInfo.remaining < 10) {
          console.log(`⚠️  Rate limit warning: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} requests remaining`);
        }
        
        if (response.status === 429) {
          const retryAfter = rateLimitInfo.retryAfter || Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`🔄 Rate limited. Waiting ${retryAfter} seconds before retry (attempt ${attempt + 1}/${maxRetries + 1})...`);
          
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        return response;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`🔄 Request failed. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries + 1})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Smart delay based on rate limit status
  async smartDelay(baseDelay = 100) {
    // If we're close to rate limit, wait longer
    if (this.rateLimitInfo.remaining !== null && this.rateLimitInfo.remaining < 5) {
      const delay = baseDelay * 5;
      console.log(`⏳ Low rate limit remaining (${this.rateLimitInfo.remaining}). Waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } else {
      await new Promise(resolve => setTimeout(resolve, baseDelay));
    }
  }

  async authenticate() {
    console.log("🔐 Authenticating with api.video...");
    
    try {
      const response = await this.fetchWithRetry(`${BASE_URL}/auth/api-key`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ apiKey: API_KEY })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      console.log("✅ Authentication successful!");
      return data;
    } catch (error) {
      console.error("❌ Authentication failed:", error.message);
      throw error;
    }
  }

  async getAllVideos() {
    console.log("📹 Fetching all videos...");
    
    let allVideos = [];
    let currentPage = 1;
    let totalPages = 1;

    try {
      do {
        console.log(`📄 Fetching page ${currentPage} of ${totalPages}...`);
        
        const response = await this.fetchWithRetry(`${BASE_URL}/videos?currentPage=${currentPage}&pageSize=25`, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch videos: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        allVideos = allVideos.concat(data.data);
        totalPages = data.pagination.pagesTotal;
        currentPage++;
        
        console.log(`📋 Found ${data.data.length} videos on this page (${allVideos.length} total so far)`);
        
        // Smart delay based on rate limits
        await this.smartDelay(200);
        
      } while (currentPage <= totalPages);

      console.log(`✅ Successfully fetched all ${allVideos.length} videos!`);
      return allVideos;
    } catch (error) {
      console.error("❌ Failed to fetch videos:", error.message);
      throw error;
    }
  }

  async getCaptionsForVideo(videoId) {
    try {
      const response = await this.fetchWithRetry(`${BASE_URL}/videos/${videoId}/captions`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return []; // No captions found
        }
        throw new Error(`Failed to fetch captions for video ${videoId}: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`❌ Failed to fetch captions for video ${videoId}:`, error.message);
      return [];
    }
  }

  async deleteCaption(videoId, language) {
    try {
      const response = await this.fetchWithRetry(`${BASE_URL}/videos/${videoId}/captions/${language}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete caption: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to delete caption (${language}) for video ${videoId}:`, error.message);
      return false;
    }
  }

  async deleteAllCaptions() {
    console.log("🚀 Starting caption deletion process...");
    
    // Step 1: Authenticate
    await this.authenticate();
    
    // Step 2: Get all videos
    const videos = await this.getAllVideos();
    
    // Step 3: Process each video with controlled concurrency
    let totalCaptionsDeleted = 0;
    let videosWithCaptions = 0;
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const progress = `[${i + 1}/${videos.length}]`;
      
      console.log(`${progress} 🔍 Checking captions for video: ${video.videoId} (${video.title})`);
      
      // Get captions for this video
      const captions = await this.getCaptionsForVideo(video.videoId);
      
      if (captions.length === 0) {
        console.log(`${progress} ✅ No captions found for video ${video.videoId}`);
      } else {
        console.log(`${progress} 📝 Found ${captions.length} caption(s) for video ${video.videoId}`);
        videosWithCaptions++;
        
        // For videos with many captions, process in smaller batches to avoid rate limits
        const batchSize = captions.length > 10 ? 5 : captions.length;
        let deletedCount = 0;
        
        for (let j = 0; j < captions.length; j += batchSize) {
          const batch = captions.slice(j, j + batchSize);
          console.log(`${progress} 🗑️  Deleting batch of ${batch.length} captions (${j + 1}-${Math.min(j + batchSize, captions.length)} of ${captions.length})...`);
          
          const deletionPromises = batch.map(caption => {
            const language = caption.srclang || caption.language;
            return this.deleteCaption(video.videoId, language);
          });
          
          try {
            const results = await Promise.all(deletionPromises);
            const batchSuccessCount = results.filter(success => success).length;
            deletedCount += batchSuccessCount;
            
            console.log(`${progress} ✅ Successfully deleted ${batchSuccessCount}/${batch.length} captions in this batch`);
            
            // Wait between batches to respect rate limits
            if (j + batchSize < captions.length) {
              await this.smartDelay(500);
            }
          } catch (error) {
            console.error(`${progress} ❌ Error during batch caption deletion:`, error.message);
          }
        }
        
        totalCaptionsDeleted += deletedCount;
        console.log(`${progress} 🎯 Total deleted for this video: ${deletedCount}/${captions.length} captions`);
      }
      
      // Smart delay between videos
      await this.smartDelay(300);
    }
    
    console.log("\n🎉 Caption deletion process completed!");
    console.log(`📊 Summary:`);
    console.log(`   • Total videos processed: ${videos.length}`);
    console.log(`   • Videos with captions: ${videosWithCaptions}`);
    console.log(`   • Total captions deleted: ${totalCaptionsDeleted}`);
  }
}

// Run the script
const deleter = new ApiVideoCaptionDeleter();
deleter.deleteAllCaptions().catch(error => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
}); 