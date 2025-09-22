const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const redis = require('redis');
const axios = require('axios');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vidiox';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Redis connection
let redisClient;
try {
  redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  });
  
  redisClient.on('error', (err) => {
    console.log('Redis Client Error', err);
  });
  
  redisClient.on('connect', () => {
    console.log('Connected to Redis');
  });
} catch (error) {
  console.log('Redis not available:', error.message);
}

// Video Schema
const videoSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  originalFilename: String,
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error'],
    default: 'uploading'
  },
  jobId: String,
  thumbnail: String,
  duration: Number,
  formats: [{
    quality: String,
    url: String,
    size: Number,
    bitrate: Number
  }],
  videoInfo: {
    width: Number,
    height: Number,
    codec: String,
    fps: Number
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Video = mongoose.model('Video', videoSchema);

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  }
});

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'vidiox-api' });
});

// Get all videos
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get single video
app.get('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Upload video
app.post('/api/videos/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const { title, description } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const videoId = uuidv4();
    
    // Create video record in database
    const video = new Video({
      id: videoId,
      title: title.trim(),
      description: description?.trim() || '',
      originalFilename: req.file.originalname,
      status: 'uploading'
    });

    await video.save();

    // Send file to video processing service
    const formData = new FormData();
    const fileStream = fs.createReadStream(req.file.path);
    formData.append('video', fileStream, req.file.originalname);

    try {
      const processingResponse = await axios.post(
        `${process.env.VIDEO_PROCESSOR_URL || 'http://localhost:5000'}/process`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      // Update video with job ID and status
      video.jobId = processingResponse.data.job_id;
      video.status = 'processing';
      await video.save();

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        id: videoId,
        title: video.title,
        description: video.description,
        status: video.status,
        jobId: video.jobId,
        message: 'Video uploaded successfully and is being processed'
      });

    } catch (processingError) {
      console.error('Error sending video to processor:', processingError);
      
      // Update video status to error
      video.status = 'error';
      await video.save();
      
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Failed to start video processing' });
    }

  } catch (error) {
    console.error('Error uploading video:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload video' });
  }
});

// Get processing status
app.get('/api/videos/:id/status', async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // If video is still processing, check with the processor service
    if (video.status === 'processing' && video.jobId) {
      try {
        const jobResponse = await axios.get(
          `${process.env.VIDEO_PROCESSOR_URL || 'http://localhost:5000'}/job/${video.jobId}`
        );

        const jobData = jobResponse.data;

        // Update video based on job status
        if (jobData.status === 'completed' && jobData.data) {
          const { encoded_files, thumbnail_url, duration, video_info } = jobData.data;
          
          video.status = 'ready';
          video.thumbnail = thumbnail_url;
          video.duration = duration;
          video.videoInfo = video_info;
          video.formats = encoded_files.map(file => ({
            quality: file.quality,
            url: file.url,
            size: file.size,
            bitrate: file.bitrate
          }));
          video.updatedAt = new Date();
          
          await video.save();
        } else if (jobData.status === 'error') {
          video.status = 'error';
          video.updatedAt = new Date();
          await video.save();
        }

      } catch (jobError) {
        console.error('Error checking job status:', jobError);
      }
    }

    res.json({
      id: video.id,
      status: video.status,
      jobId: video.jobId,
      updatedAt: video.updatedAt
    });

  } catch (error) {
    console.error('Error checking video status:', error);
    res.status(500).json({ error: 'Failed to check video status' });
  }
});

// Update video metadata
app.put('/api/videos/:id', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    const video = await Video.findOne({ id: req.params.id });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (title) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    video.updatedAt = new Date();

    await video.save();
    res.json(video);

  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// Delete video
app.delete('/api/videos/:id', async (req, res) => {
  try {
    const video = await Video.findOne({ id: req.params.id });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // TODO: Delete video files from storage
    
    await Video.deleteOne({ id: req.params.id });
    res.json({ message: 'Video deleted successfully' });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

// Background job to update processing statuses
const checkProcessingJobs = async () => {
  try {
    const processingVideos = await Video.find({ status: 'processing' });
    
    for (const video of processingVideos) {
      if (video.jobId) {
        try {
          const jobResponse = await axios.get(
            `${process.env.VIDEO_PROCESSOR_URL || 'http://localhost:5000'}/job/${video.jobId}`
          );

          const jobData = jobResponse.data;

          if (jobData.status === 'completed' && jobData.data) {
            const { encoded_files, thumbnail_url, duration, video_info } = jobData.data;
            
            video.status = 'ready';
            video.thumbnail = thumbnail_url;
            video.duration = duration;
            video.videoInfo = video_info;
            video.formats = encoded_files.map(file => ({
              quality: file.quality,
              url: file.url,
              size: file.size,
              bitrate: file.bitrate
            }));
            video.updatedAt = new Date();
            
            await video.save();
            console.log(`Video ${video.id} processing completed`);

          } else if (jobData.status === 'error') {
            video.status = 'error';
            video.updatedAt = new Date();
            await video.save();
            console.log(`Video ${video.id} processing failed`);
          }

        } catch (jobError) {
          console.error(`Error checking job ${video.jobId}:`, jobError.message);
        }
      }
    }
  } catch (error) {
    console.error('Error in background job checker:', error);
  }
};

// Run background job every 30 seconds
setInterval(checkProcessingJobs, 30000);

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 2GB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`VidioX API server running on port ${PORT}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);
  console.log(`Video Processor URL: ${process.env.VIDEO_PROCESSOR_URL || 'http://localhost:5000'}`);
});