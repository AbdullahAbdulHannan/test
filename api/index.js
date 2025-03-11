const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// LinkedIn API Credentials
const accessToken = `EAASbD3SBqFoBO04ZCM9mBXanMAC5XXY4SZBrTWp3wQAmhQ7XLcLumFMduZCAty6bnIrobGcm2KX9r5kE3mVZAI5esETT0XycHzozBQ9mR1N7uvmvA5dCHwnYlitKM8uryZBlXEKZAKdeNZC6a8qUu7dliKoxA3j0zC7dFcKyjbsO1GyAQXqzGnPUzqXCYtYdiwZD`;
const organizationId = '106596928';

// Helper function to get timestamps in milliseconds
const getTimeRanges = () => {
  const now = new Date();
  const utcYesterday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0);
  const utcThirtyDaysAgo = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30, 0, 0, 0, 0);
  const currentTime = Date.now();
  return { thirtyDaysAgo: utcThirtyDaysAgo, currentTime, yesterday: utcYesterday };
};

// Generic function to fetch LinkedIn API data
const fetchLinkedInData = async (url) => {
  try {
    const response = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    return response.data;
  } catch (error) {
    console.error(`Error fetching data: ${error.response?.data || error.message}`);
    return { error: 'Failed to fetch data' };
  }
};

// API Routes
app.get('/api/linkedin/followers', async (req, res) => {
  const url = `https://api.linkedin.com/v2/networkSizes/urn:li:organization:${organizationId}?edgeType=CompanyFollowedByMember`;
  res.json(await fetchLinkedInData(url));
});

app.get('/api/linkedin/daily-followers', async (req, res) => {
  const { yesterday, currentTime } = getTimeRanges();
  const url = `https://api.linkedin.com/v2/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${yesterday}&timeIntervals.timeRange.end=${currentTime}`;
  res.json(await fetchLinkedInData(url));
});

app.get('/api/linkedin/page-views', async (req, res) => {
  const { yesterday, currentTime } = getTimeRanges();
  const url = `https://api.linkedin.com/v2/organizationPageStatistics?q=organization&organization=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${yesterday}&timeIntervals.timeRange.end=${currentTime}`;
  res.json(await fetchLinkedInData(url));
});

app.get('/api/linkedin/total-posts', async (req, res) => {
  const url = `https://api.linkedin.com/v2/posts?q=author&author=urn:li:organization:${organizationId}`;
  res.json(await fetchLinkedInData(url));
});

app.get('/api/linkedin/engagements', async (req, res) => {
  const { thirtyDaysAgo, currentTime } = getTimeRanges();
  const url = `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${organizationId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${thirtyDaysAgo}&timeIntervals.timeRange.end=${currentTime}`;
  res.json(await fetchLinkedInData(url));
});

// Function to post text on LinkedIn
app.post('/api/linkedin/post-text', async (req, res) => {
  const { text } = req.body;
  try {
    const { data: user } = await axios.get("https://api.linkedin.com/v2/me", { headers: { Authorization: `Bearer ${accessToken}` } });
    const userURN = `urn:li:person:${user.id}`;
    const postData = {
      author: userURN,
      lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };
    const response = await axios.post("https://api.linkedin.com/v2/ugcPosts", postData, { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } });
    res.json(response.data);
  } catch (error) {
    console.error("LinkedIn post failed:", error.response?.data || error);
    res.status(500).json({ error: 'Failed to post' });
  }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));