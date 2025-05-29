import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.BASE_URL || "https://ws.api.video";

if (!API_KEY) {
  console.error("❌ API_KEY is required. Please set it in your .env file.");
  process.exit(1);
}

class FastCaptionDeleter {
  constructor() {
    this.accessToken = null;
    this.rateLimitInfo = { limit: null, remaining: null };
    this.startTime = Date.now();
  }

  parseRateLimitHeaders(response) {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const retryAfter = response.headers.get('X-RateLimit-Retry-After');
    
    if (limit) this.rateLimitInfo.limit = parseInt(limit);
    if (remaining) this.rateLimitInfo.remaining = parseInt(remaining);
    
    return {
      limit: this.rateLimitInfo.limit,
      remaining: this.rateLimitInfo.remaining,
      retryAfter: retryAfter ? parseInt(retryAfter) : null
    };
  }

  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        this.parseRateLimitHeaders(response);
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('X-RateLimit-Retry-After') || Math.pow(2, attempt);
          console.log(`🔄 Rate limited. Waiting ${retryAfter}s...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        return response;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  async authenticate() {
    console.log("🚀 FAST MODE: Authenticating...");
    const response = await this.fetchWithRetry(`${BASE_URL}/auth/api-key`, {
      method: 'POST',
      headers: { 'accept': 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: API_KEY })
    });

    if (!response.ok) throw new Error(`Authentication failed: ${response.status}`);
    
    const data = await response.json();
    this.accessToken = data.access_token;
    console.log("✅ Authenticated!");
    return data;
  }

  async getAllVideos() {
    console.log("📹 Fetching all videos...");
    let allVideos = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await this.fetchWithRetry(`${BASE_URL}/videos?currentPage=${currentPage}&pageSize=100`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });

      if (!response.ok) throw new Error(`Failed to fetch videos: ${response.status}`);

      const data = await response.json();
      allVideos = allVideos.concat(data.data);
      totalPages = data.pagination.pagesTotal;
      currentPage++;
      
      // Minimal delay for pagination
      await new Promise(resolve => setTimeout(resolve, 50));
    } while (currentPage <= totalPages);

    console.log(`✅ Fetched ${allVideos.length} videos!`);
    return allVideos;
  }

  async getCaptionsForVideo(videoId) {
    try {
      const response = await this.fetchWithRetry(`${BASE_URL}/videos/${videoId}/captions`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });

      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`Failed to fetch captions: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`❌ Error getting captions for ${videoId}:`, error.message);
      return [];
    }
  }

  async deleteCaption(videoId, language) {
    try {
      const response = await this.fetchWithRetry(`${BASE_URL}/videos/${videoId}/captions/${language}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async processBatch(videos, batchIndex, totalBatches) {
    let deletedCount = 0;
    const elapsed = (Date.now() - this.startTime) / 1000 / 60;
    const remaining = 10 - elapsed;
    
    console.log(`🔥 Batch ${batchIndex + 1}/${totalBatches} | ${remaining.toFixed(1)} min remaining`);

    for (const video of videos) {
      const captions = await this.getCaptionsForVideo(video.videoId);
      
      if (captions.length === 0) continue;
      
      console.log(`🗑️  Deleting ${captions.length} captions from ${video.videoId}`);
      
      // Process captions in small concurrent batches
      const captionBatches = [];
      for (let i = 0; i < captions.length; i += 3) {
        captionBatches.push(captions.slice(i, i + 3));
      }
      
      for (const captionBatch of captionBatches) {
        const promises = captionBatch.map(caption => 
          this.deleteCaption(video.videoId, caption.srclang || caption.language)
        );
        
        const results = await Promise.all(promises);
        deletedCount += results.filter(Boolean).length;
        
        // Tiny delay only if approaching rate limit
        if (this.rateLimitInfo.remaining && this.rateLimitInfo.remaining < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    
    return deletedCount;
  }

  async fastDeleteAllCaptions() {
    console.log("🚀🚀🚀 FAST MODE: 10-MINUTE CAPTION DELETION 🚀🚀🚀");
    this.startTime = Date.now();
    
    await this.authenticate();
    const videos = await this.getAllVideos();
    
    // Process videos in parallel batches
    const batchSize = 10; // Process 10 videos in parallel
    const batches = [];
    for (let i = 0; i < videos.length; i += batchSize) {
      batches.push(videos.slice(i, i + batchSize));
    }
    
    console.log(`🔥 Processing ${videos.length} videos in ${batches.length} parallel batches`);
    
    let totalDeleted = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const batchPromises = batches[i].map(video => 
        this.processBatch([video], i, batches.length)
      );
      
      const batchResults = await Promise.all(batchPromises);
      const batchTotal = batchResults.reduce((sum, count) => sum + count, 0);
      totalDeleted += batchTotal;
      
      const elapsed = (Date.now() - this.startTime) / 1000 / 60;
      const remaining = 10 - elapsed;
      const videosProcessed = (i + 1) * batchSize;
      const speed = videosProcessed / elapsed;
      const eta = (videos.length - videosProcessed) / speed;
      
      console.log(`⚡ Progress: ${videosProcessed}/${videos.length} videos | ${totalDeleted} captions deleted`);
      console.log(`⏱️  Time: ${elapsed.toFixed(1)}min elapsed, ${remaining.toFixed(1)}min remaining, ETA: ${eta.toFixed(1)}min`);
      
      if (remaining < 1) {
        console.log("⚠️  Less than 1 minute remaining! Continuing at maximum speed...");
      }
      
      if (elapsed >= 10) {
        console.log("⏰ 10 minutes reached. Stopping...");
        break;
      }
    }
    
    const totalTime = (Date.now() - this.startTime) / 1000 / 60;
    console.log(`\n🎉 FAST DELETION COMPLETED!`);
    console.log(`📊 Summary:`);
    console.log(`   • Total captions deleted: ${totalDeleted}`);
    console.log(`   • Time taken: ${totalTime.toFixed(2)} minutes`);
    console.log(`   • Average speed: ${(totalDeleted / totalTime).toFixed(1)} captions/minute`);
  }
}

const deleter = new FastCaptionDeleter();
deleter.fastDeleteAllCaptions().catch(error => {
  console.error("💥 Error:", error);
  process.exit(1);
}); 