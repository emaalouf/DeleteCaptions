# API.Video Caption Deleter

This Node.js script deletes all captions from all videos in your api.video account.

## Features

- ✅ Authenticates with api.video using your API key
- ✅ Fetches all videos with automatic pagination handling
- ✅ Checks each video for captions
- ✅ Deletes all found captions
- ✅ Provides detailed progress logging
- ✅ Includes error handling and rate limiting
- ✅ Uses environment variables for secure API key storage

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

**Run the script:**
```bash
npm start
```

Or directly:
```bash
node index.js
```

## What the script does

1. **Environment Setup**: Loads API key from environment variables
2. **Authentication**: Uses your API key to get an access token
3. **Video Fetching**: Retrieves all videos from your account (handles pagination automatically)
4. **Caption Discovery**: For each video, checks if it has captions
5. **Caption Deletion**: Deletes all found captions for each video
6. **Summary**: Provides a final report of the deletion process

## Example Output

```
🔐 Authenticating with api.video...
✅ Authentication successful!
📹 Fetching all videos...
📄 Fetching page 1 of 1...
📋 Found 25 videos on this page (25 total so far)
✅ Successfully fetched all 25 videos!
[1/25] 🔍 Checking captions for video: vi2Y2FFzw8IVMZ8hXyKTBmcJ (Sample Video)
[1/25] 📝 Found 2 caption(s) for video vi2Y2FFzw8IVMZ8hXyKTBmcJ
[1/25] 🗑️  Deleting caption (en) for video vi2Y2FFzw8IVMZ8hXyKTBmcJ...
[1/25] ✅ Successfully deleted caption (en)
[1/25] 🗑️  Deleting caption (fr) for video vi2Y2FFzw8IVMZ8hXyKTBmcJ...
[1/25] ✅ Successfully deleted caption (fr)
...
🎉 Caption deletion process completed!
📊 Summary:
   • Total videos processed: 25
   • Videos with captions: 12
   • Total captions deleted: 18
```

## Safety Features

- **Environment Variables**: API key is stored securely in .env file
- **Rate Limiting**: Includes small delays between API calls to be respectful to the API
- **Error Handling**: Continues processing even if individual operations fail
- **Progress Tracking**: Shows detailed progress for long-running operations
- **Graceful Degradation**: Handles missing captions and other edge cases

## Important Notes

⚠️ **This action is irreversible!** Make sure you want to delete all captions before running the script.

The script processes all videos in your account and deletes ALL captions found. There's no undo functionality.

## Security

- The `.env` file is included in `.gitignore` to prevent accidentally committing your API key
- Never share your API key or commit it to version control 