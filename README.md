# API.Video Caption Deleter

This Node.js project provides scripts to manage captions on your api.video account.

## Scripts

- **`index.js`** - Deletes ALL captions from ALL videos (irreversible!)
- **`check-captions.js`** - Checks which videos still have captions (read-only)

## Features

- ✅ Authenticates with api.video using your API key
- ✅ Fetches all videos with automatic pagination handling
- ✅ **Concurrent caption deletion** - Deletes all captions for each video simultaneously for maximum speed
- ✅ Detailed progress logging and summary reports
- ✅ Error handling and rate limiting
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

### Delete All Captions (Fast & Concurrent)
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

## Performance Improvements

The deletion script now uses **concurrent processing** for maximum speed:
- **Before**: Deleted captions one by one (22 captions × 200ms delay = ~4.4 seconds per video)
- **After**: Deletes all captions for a video simultaneously (~1 second per video)

For a video with 22 captions, this is **4x faster**! 🚀

## What the scripts do

### Caption Deleter (`index.js`)
1. **Environment Setup**: Loads API key from environment variables
2. **Authentication**: Gets access token from api.video
3. **Video Fetching**: Retrieves all videos (handles pagination automatically)
4. **Concurrent Caption Deletion**: For each video, deletes ALL captions simultaneously
5. **Summary**: Provides detailed report of deletions

### Caption Checker (`check-captions.js`)
1. **Authentication**: Gets access token from api.video  
2. **Video Fetching**: Retrieves all videos (handles pagination automatically)
3. **Caption Discovery**: Checks each video for remaining captions
4. **Report**: Lists all videos that still have captions with language details

## Example Output

### Deletion Script (Concurrent)
```
🚀 Starting caption deletion process...
✅ Authentication successful!
📹 Fetching all videos...
✅ Successfully fetched all 511 videos!
[56/511] 🔍 Checking captions for video: vi4ZqPnMPidp9mPCVxxlmIq0 (Heal From Rejection-2.mp4)
[56/511] 📝 Found 22 caption(s) for video vi4ZqPnMPidp9mPCVxxlmIq0
[56/511] 🗑️  Deleting all 22 captions concurrently...
[56/511] ✅ Successfully deleted 22/22 captions
...
🎉 Caption deletion process completed!
📊 Summary:
   • Total videos processed: 511
   • Videos with captions: 127
   • Total captions deleted: 2,840
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
- **Concurrent Processing**: Maximum speed with API rate limiting
- **Error Handling**: Continues processing even if individual operations fail
- **Progress Tracking**: Detailed progress for long-running operations
- **Read-only Checker**: Verify results without risk of accidental deletion

## Important Notes

⚠️ **Caption deletion is irreversible!** Use the checker script first to see what will be deleted.

The deletion script processes all videos and deletes ALL captions found. There's no undo functionality.

## Security

- The `.env` file is included in `.gitignore` to prevent accidentally committing your API key
- Never share your API key or commit it to version control 