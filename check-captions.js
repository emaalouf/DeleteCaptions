import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL || "https://ws.api.video";

// Validate that API_KEY is provided
if (!API_KEY) {
  console.error("❌ API_KEY is required. Please set it in your .env file.");
  process.exit(1);
}

class ApiVideoCaptionChecker {
  constructor() {
    this.accessToken = null;
  }

  async authenticate() {
    console.log("🔐 Authenticating with api.video...");
    
    try {
      const response = await fetch(`${BASE_URL}/auth/api-key`, {
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
        
        const response = await fetch(`${BASE_URL}/videos?currentPage=${currentPage}&pageSize=25`, {
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
        
        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
      const response = await fetch(`${BASE_URL}/videos/${videoId}/captions`, {
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

  async checkAllCaptions() {
    console.log("🔍 Starting caption check process...");
    
    // Step 1: Authenticate
    await this.authenticate();
    
    // Step 2: Get all videos
    const videos = await this.getAllVideos();
    
    // Step 3: Check each video for captions
    let totalCaptionsFound = 0;
    let videosWithCaptions = 0;
    const videosWithCaptionsList = [];
    
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
        totalCaptionsFound += captions.length;
        
        // Log the languages found
        const languages = captions.map(caption => caption.srclang || caption.language).join(', ');
        console.log(`${progress} 🌍 Languages: ${languages}`);
        
        videosWithCaptionsList.push({
          videoId: video.videoId,
          title: video.title,
          captionCount: captions.length,
          languages: languages
        });
      }
      
      // Small delay between videos
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log("\n📊 Caption Check Summary:");
    console.log(`   • Total videos processed: ${videos.length}`);
    console.log(`   • Videos with captions: ${videosWithCaptions}`);
    console.log(`   • Total captions found: ${totalCaptionsFound}`);
    
    if (videosWithCaptions > 0) {
      console.log("\n📋 Videos that still have captions:");
      videosWithCaptionsList.forEach((video, index) => {
        console.log(`   ${index + 1}. ${video.videoId} (${video.title})`);
        console.log(`      └── ${video.captionCount} captions: ${video.languages}`);
      });
    } else {
      console.log("\n🎉 No captions found! All captions have been successfully deleted.");
    }
  }
}

// Run the checker
const checker = new ApiVideoCaptionChecker();
checker.checkAllCaptions().catch(error => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
}); 