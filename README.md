# API.Video Caption Deleter

This Node.js project provides scripts to manage captions on your api.video account with intelligent rate limiting.

## Scripts

- **`index.js`** - Deletes ALL captions from ALL videos (irreversible!)
- **`check-captions.js`** - Checks which videos still have captions (read-only)

## Features

- ✅ Authenticates with api.video using your API key
- ✅ Fetches all videos with automatic pagination handling
- ✅ **Smart batch processing** - Processes captions in batches to respect rate limits
- ✅ **Automatic retry logic** - Handles 429 rate limit errors with exponential backoff
- ✅ **Rate limit monitoring** - Tracks and responds to API rate limit headers
- ✅ Detailed progress logging and summary reports
- ✅ Error handling and graceful degradation
- ✅ Uses environment variables for secure API key storage
- ✅ Read-only caption checker for verification

## Prerequisites

- Node.js 18+ (for built-in fetch support)
- Valid api.video API key

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your API key:**
   The API key is already set in the `.env` file. If you need to change it, edit the `.env` file:
   ```
   API_KEY=your_api_key_here
   BASE_URL=https://ws.api.video
   ```

## Usage

### Delete All Captions (Smart Rate-Limited)
**⚠️ WARNING: This is irreversible!**
```bash
npm start
```

### Check Which Videos Still Have Captions
```bash
npm run check
```

Or run directly:
```bash
node index.js        # Delete all captions
node check-captions.js   # Check for remaining captions
```

## Rate Limiting & Performance

The scripts now include **intelligent rate limiting** to prevent 429 errors:

### Automatic Rate Limit Handling
- **Header monitoring**: Tracks `X-RateLimit-Remaining` and `X-RateLimit-Retry-After`
- **Smart delays**: Increases wait times when approaching rate limits
- **Automatic retry**: Retries failed requests with exponential backoff
- **Batch processing**: Processes large caption sets in smaller batches

### Processing Strategy
- **Videos with ≤10 captions**: Process all concurrently
- **Videos with >10 captions**: Process in batches of 5 with delays
- **Between videos**: Smart delays based on remaining rate limit

This approach balances speed with API compliance, ensuring your requests succeed without hitting rate limits.

## What the scripts do

### Caption Deleter (`index.js`)
1. **Environment Setup**: Loads API key from environment variables
2. **Authentication**: Gets access token from api.video
3. **Video Fetching**: Retrieves all videos (handles pagination automatically)
4. **Smart Caption Deletion**: Processes captions in rate-limit-aware batches
5. **Summary**: Provides detailed report of deletions

### Caption Checker (`check-captions.js`)
1. **Authentication**: Gets access token from api.video  
2. **Video Fetching**: Retrieves all videos (handles pagination automatically)
3. **Caption Discovery**: Checks each video for remaining captions
4. **Report**: Lists all videos that still have captions with language details

## Example Output

### Deletion Script (Rate-Limited Batches)
```
🚀 Starting caption deletion process...
✅ Authentication successful!
📹 Fetching all videos...
✅ Successfully fetched all 511 videos!
[56/511] 🔍 Checking captions for video: vi4ZqPnMPidp9mPCVxxlmIq0 (Heal From Rejection-2.mp4)
[56/511] 📝 Found 22 caption(s) for video vi4ZqPnMPidp9mPCVxxlmIq0
[56/511] 🗑️  Deleting batch of 5 captions (1-5 of 22)...
[56/511] ✅ Successfully deleted 5/5 captions in this batch
[56/511] 🗑️  Deleting batch of 5 captions (6-10 of 22)...
[56/511] ✅ Successfully deleted 5/5 captions in this batch
[56/511] 🗑️  Deleting batch of 5 captions (11-15 of 22)...
⚠️  Rate limit warning: 8/100 requests remaining
⏳ Low rate limit remaining (8). Waiting 1500ms...
[56/511] ✅ Successfully deleted 5/5 captions in this batch
[56/511] 🎯 Total deleted for this video: 22/22 captions
...
🎉 Caption deletion process completed!
📊 Summary:
   • Total videos processed: 511
   • Videos with captions: 127
   • Total captions deleted: 2,840
```

### Rate Limit Error Handling
```
🔄 Rate limited. Waiting 60 seconds before retry (attempt 1/4)...
⚠️  Rate limit warning: 2/100 requests remaining
⏳ Low rate limit remaining (2). Waiting 900ms...
```

### Checker Script
```
🔍 Starting caption check process...
✅ Authentication successful!
📹 Fetching all videos...
✅ Successfully fetched all 511 videos!
[1/511] ✅ No captions found for video vimRsLwx8pzlV2T5xrZT4Ka
[2/511] 📝 Found 3 caption(s) for video vi2Y2FFzw8IVMZ8hXyKTBmcJ
[2/511] 🌍 Languages: en, fr, es
...
📊 Caption Check Summary:
   • Total videos processed: 511
   • Videos with captions: 12
   • Total captions found: 34

📋 Videos that still have captions:
   1. vi2Y2FFzw8IVMZ8hXyKTBmcJ (Sample Video)
      └── 3 captions: en, fr, es
```

## Safety Features

- **Environment Variables**: API key stored securely in .env file
- **Smart Rate Limiting**: Automatic handling of API limits with intelligent delays
- **Batch Processing**: Controlled concurrency to prevent overwhelming the API
- **Retry Logic**: Automatic retries with exponential backoff for failed requests
- **Error Handling**: Continues processing even if individual operations fail
- **Progress Tracking**: Detailed progress for long-running operations
- **Read-only Checker**: Verify results without risk of accidental deletion

## Important Notes

⚠️ **Caption deletion is irreversible!** Use the checker script first to see what will be deleted.

The deletion script processes all videos and deletes ALL captions found. There's no undo functionality.

## Troubleshooting Rate Limits

If you still encounter rate limit issues:
1. **Check your plan**: Some api.video plans have lower rate limits
2. **Run during off-peak hours**: API limits may be more generous
3. **Use the checker first**: Verify which videos actually have captions
4. **Contact api.video**: Request higher rate limits if needed

## Security

- The `.env` file is included in `.gitignore` to prevent accidentally committing your API key
- Never share your API key or commit it to version control 