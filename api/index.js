const express=require('express')
const axios=require('axios')
const cors=require('cors')
const app = express();
const PORT = 5000;
const multer = require('multer'); // Middleware for handling file uploads
const upload = multer(); // Configure multer for memory storage
const fs = require('fs');
// Enable CORS for frontend requests
app.use(cors());
// Middleware to parse JSON and multipart form data
app.use(express.json()); // For JSON payloads
app.use(express.urlencoded({ extended: true })); // For URL-encoded payloads
// LinkedIn API Credentials
const accessToken = 'AQWqlRcRIuDx0EM-tn9g6z7ObPwTe6Bvz8r1Xl2NWlMlzPF7dNS7Zeb9L6DRIW01m38ccEYxBt7ukaGuNfxGtPcs6-g6a9vyssLLiF-fSbcawZGKslOEn7Yi3DkdJ3IOyb6v41WY951trMd46tE9--Qm1MrtH5B1c3-4ub00bTtq8jpceAaI5wp3dJ0RXRsXlSJm8xZ56axjq9ww-Az16AQC_IPgh5MGgE5gLh2w13ZNR_zPROFk2c9pqdkGrv8sak5XvUZSGQcf4ml2IEHQZ3IXrcuTJU6b_w80XUP547zCLzMJR8Nj2e531ISFqetk0g3Q-POAguNtWVemwah47T_b6YVEsg';
const organizationId = '106596928';

// Helper function to get timestamps in milliseconds
const getTimeRanges = () => {
  const now = new Date();
  // const utcNow = Date.UTC(
  //   now.getUTCFullYear(),
  //   now.getUTCMonth(),
  //   now.getUTCDate(),
  //   23, 59, 59, 999 // End of the current day in UTC
  // );

  const utcYesterday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 1,
    0, 0, 0, 0 // Start of the previous day in UTC
  );

  const utcThirtyDaysAgo = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - 30,
    0, 0, 0, 0 // Start of 30 days ago in UTC
  );
  const startOfToday = new Date().setHours(0, 0, 0, 0); // Start of today in milliseconds
  const currentTime = Date.now(); // Current time in milliseconds
  return { thirtyDaysAgo: utcThirtyDaysAgo,currentTime,startOfToday,yesterday:utcYesterday };
};

// API routes for LinkedIn data fetching
app.get('/api/linkedin/followers', async (req, res) => {
  try {
    const url = `https://api.linkedin.com/v2/networkSizes/urn:li:organization:${organizationId}?edgeType=CompanyFollowedByMember`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching LinkedIn followers:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

app.get('/api/linkedin/daily-followers', async (req, res) => {
  try {
    const { yesterday, currentTime } = getTimeRanges();
    const url = `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${yesterday}&timeIntervals.timeRange.end=${currentTime}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching LinkedIn daily followers:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch daily followers' });
  }
});
app.get('/api/linkedin/page-views', async (req, res) => {
  try {
    const { yesterday, currentTime } = getTimeRanges();
    const url = `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${yesterday}&timeIntervals.timeRange.end=${currentTime}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching LinkedIn page views:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch page views' });
  }
});

app.get('/api/linkedin/total-posts', async (req, res) => {
  try {
    const url = `https://api.linkedin.com/v2/posts?q=author&author=urn:li:organization:${organizationId}`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching LinkedIn posts:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});
app.get('/api/linkedin/engagements', async (req, res) => {
  try {
    const MS_PER_DAY = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Ensure today’s end time is fixed
    
    const timestamps = [];

    for (let i = 30; i >= 0; i--) {
      const start = new Date(today.getTime() - i * MS_PER_DAY); 
      start.setHours(0, 0, 0, 0); // Set start time to 00:00:00

      let end;
      if (i === 0) {
        // Today’s end time at 23:59:59
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        console.log(end,"end");
        
      } else {
        end = new Date(today.getTime() - (i - 1) * MS_PER_DAY);
        end.setHours(23, 59, 59, 999);
        
        
      }

      timestamps.push({ start: start.getTime(), end: end.getTime() });
    }

    console.log(timestamps); // Debugging output

    // Fetch data for each timestamp range
    const engagementRequests = timestamps.map(({ start, end }) => {
      const url = `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${start}&timeIntervals.timeRange.end=${end}`;
      
      return axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(response => ({
        date: new Date(start).toISOString().split('T')[0], // Format date YYYY-MM-DD
        data: response.data
      })).catch(error => ({
        date: new Date(start).toISOString().split('T')[0],
        error: error.response?.data || error.message
      }));
    });

    const engagementData = await Promise.all(engagementRequests);

    res.json(engagementData);
  } catch (error) {
    console.error('Error fetching LinkedIn engagements:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch engagements' });
  }
});

app.get('/api/linkedin/post-engagements', async (req, res) => {
  try {
    const postsUrl = `https://api.linkedin.com/v2/posts?q=author&author=urn:li:organization:${organizationId}&count=3`;
    const postsResponse = await axios.get(postsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const latestPosts = postsResponse.data.elements;
    const postUrns = latestPosts.map(post => post.id);

    // Step 2: Fetch social metadata for each post
    const engagementRequests = postUrns.map(postUrn => {
      const url = `https://api.linkedin.com/v2/socialMetadata/${postUrn}`;
      return axios.get(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then(response => ({
        postUrn,
        data: response.data
      })).catch(error => ({
        postUrn,
        error: error.response?.data || error.message
      }));
    });

    const engagementData = await Promise.all(engagementRequests);

    res.json(engagementData);
  } catch (error) {
    console.error('Error fetching LinkedIn post engagements:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch post engagements' });
  }
});

// app.get('/api/linkedin/total-reels', async (req, res) => {
//   try {
//     const url = `https://api.linkedin.com/v2/posts?q=author&author=urn:li:organization:${organizationId}&mediaType=VIDEO`;

//     const response = await axios.get(url, {
//       headers: { Authorization: `Bearer ${accessToken}` },
//     });

//     res.json(response.data);
//   } catch (error) {
//     console.error('Error fetching LinkedIn reels:', error.response?.data || error.message);
//     res.status(500).json({ error: 'Failed to fetch reels' });
//   }
// });

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

// Function to post text on LinkedIn
app.post('/api/linkedin/post-text', upload.array('images'), async (req, res) => {
  const { text } = req.body;
  const images = req.files; // Array of uploaded images

  if (!text && (!images || images.length === 0)) {
    return res.status(400).json({ error: 'Either text or images are required for the post' });
  }

  try {
    
    const userURN = `urn:li:organization:${organizationId}`;

    const mediaAssets = [];
    if (images && images.length > 0) {
      for (const image of images) {
        const initializeResponse = await axios.post(
          "https://api.linkedin.com/v2/assets?action=registerUpload",
          {
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: userURN,
              serviceRelationships: [
                {
                  relationshipType: "OWNER",
                  identifier: "urn:li:userGeneratedContent",
                },
              ],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const uploadUrl = initializeResponse.data.value.uploadMechanism[
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ].uploadUrl;
        const asset = initializeResponse.data.value.asset;

        await axios.put(uploadUrl, image.buffer, {
          headers: { "Content-Type": image.mimetype },
        });

        mediaAssets.push(asset);
      }
    }

    const postData = {
      author: userURN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text || "", // Use empty string if no text is provided
          },
          shareMediaCategory: images && images.length > 0 ? "IMAGE" : "NONE",
          media: mediaAssets.map((asset) => ({
            status: "READY",
            description: {
              text: "Uploaded image",
            },
            media: asset,
            title: {
              text: "Image title",
            },
          })),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    const response = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      postData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("LinkedIn post failed:", error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to post to LinkedIn' });
  }
});

