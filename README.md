# VidioX - Video Streaming Service with Encoding

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)

A mini-Netflix or YouTube project that allows users to upload videos, which are then processed and encoded into multiple formats for streaming.

**Author:** Jessie Borras  
**Website:** [jessiedev.xyz](https://jessiedev.xyz)

## 🌟 Features

- **Video Upload**: Drag-and-drop interface with support for multiple video formats
- **Automatic Encoding**: FFmpeg-powered video processing with multiple quality profiles
- **Adaptive Streaming**: Multiple quality options (240p, 360p, 480p, 720p, 1080p)
- **Cloud Storage**: Support for AWS S3 and Cloudinary
- **Real-time Processing**: Live status updates during video processing
- **Responsive Design**: Modern UI built with Material-UI
- **Scalable Architecture**: Microservices architecture with Docker support

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Node.js API    │    │ Python Processor │
│   (Port 3000)    │◄──►│   (Port 3001)   │◄──►│   (Port 5000)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌─────────────┐          ┌─────────────┐
                        │  MongoDB    │          │    Redis    │
                        │ (Port 27017)│          │ (Port 6379) │
                        └─────────────┘          └─────────────┘
                                │
                                ▼
                        ┌─────────────────────┐
                        │   Storage Layer     │
                        │ (AWS S3/Cloudinary) │
                        └─────────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for components
- **React Router** for navigation
- **Axios** for API calls
- **React Player** for video playback
- **React Dropzone** for file uploads

### Backend API
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Redis** for job queuing
- **Multer** for file uploads
- **JWT** for authentication (planned)

### Video Processing
- **Python** with Flask
- **FFmpeg** for video encoding
- **Redis** for job status tracking
- **Threading** for background processing

### Storage & Deployment
- **AWS S3** for video storage
- **Cloudinary** as alternative storage
- **Docker & Docker Compose**
- **MongoDB** for metadata
- **Redis** for caching and queues

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- FFmpeg (for local development)

### Using Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd VidioX
```

2. **Start all services**
```bash
docker-compose up -d
```

3. **Access the application**
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Video Processor: http://localhost:5000

### Manual Setup

#### 1. Database Setup
```bash
# Start MongoDB and Redis
docker run -d -p 27017:27017 --name mongodb mongo:6.0
docker run -d -p 6379:6379 --name redis redis:7.0-alpine
```

#### 2. Backend API Setup
```bash
cd backend/api
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

#### 3. Video Processor Setup
```bash
cd backend/video-processor
pip install -r requirements.txt
python app.py
```

#### 4. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## ⚙️ Configuration

### Environment Variables

#### API Server (.env)
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/vidiox
REDIS_HOST=localhost
REDIS_PORT=6379
VIDEO_PROCESSOR_URL=http://localhost:5000

# Optional: AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your-bucket-name

# Optional: Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Video Processor
```env
REDIS_HOST=localhost
REDIS_PORT=6379
S3_BUCKET=your-bucket-name
```

## 📋 API Endpoints

### Videos
- `GET /api/videos` - Get all videos
- `GET /api/videos/:id` - Get single video
- `POST /api/videos/upload` - Upload video
- `GET /api/videos/:id/status` - Get processing status
- `PUT /api/videos/:id` - Update video metadata
- `DELETE /api/videos/:id` - Delete video

### Health Checks
- `GET /health` - API health check
- `GET /health` - Video processor health check

## 🎥 Video Processing Pipeline

1. **Upload**: User uploads video via frontend
2. **Storage**: File temporarily stored on API server
3. **Queue**: Processing job queued to video processor
4. **Analysis**: FFmpeg analyzes video metadata
5. **Encoding**: Multiple quality versions created
6. **Upload**: Processed videos uploaded to cloud storage
7. **Database**: Metadata updated with streaming URLs
8. **Cleanup**: Temporary files removed

### Encoding Profiles

| Quality | Resolution | Video Bitrate | Audio Bitrate | FPS |
|---------|------------|---------------|---------------|-----|
| 240p    | 426x240    | 400k         | 64k          | 30  |
| 360p    | 640x360    | 800k         | 96k          | 30  |
| 480p    | 854x480    | 1200k        | 128k         | 30  |
| 720p    | 1280x720   | 2500k        | 192k         | 30  |
| 1080p   | 1920x1080  | 5000k        | 256k         | 30  |

## 🧪 Testing

```bash
# API tests
cd backend/api
npm test

# Video processor tests
cd backend/video-processor
python -m pytest

# Frontend tests
cd frontend
npm test
```

## 📦 Deployment

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### AWS ECS
1. Build and push images to ECR
2. Create ECS task definitions
3. Set up Application Load Balancer
4. Configure auto-scaling

## 🔧 Development

### Project Structure
```
VidioX/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   └── types/           # TypeScript types
│   └── public/              # Static assets
├── backend/
│   ├── api/                 # Node.js API server
│   │   ├── routes/          # API routes
│   │   ├── models/          # Database models
│   │   └── utils/           # Utilities
│   └── video-processor/     # Python processing service
│       ├── app.py           # Main Flask app
│       └── requirements.txt # Python dependencies
├── docs/                    # Documentation
├── scripts/                 # Deployment scripts
└── docker-compose.yml       # Docker services
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## 🐛 Troubleshooting

### Common Issues

1. **FFmpeg not found**
```bash
# Ubuntu/Debian
sudo apt-get install ffmpeg

# macOS
brew install ffmpeg

# Docker automatically includes FFmpeg
```

2. **Port conflicts**
```bash
# Check what's using ports
lsof -i :3000
lsof -i :3001
lsof -i :5000
```

3. **MongoDB connection issues**
```bash
# Check MongoDB status
docker ps | grep mongo
docker logs mongodb
```

4. **Video processing stuck**
```bash
# Check Redis queues
redis-cli
KEYS job:*
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FFmpeg](https://ffmpeg.org/) for video processing
- [React](https://reactjs.org/) for the frontend framework
- [Material-UI](https://mui.com/) for the component library
- [Express.js](https://expressjs.com/) for the API framework
- [MongoDB](https://www.mongodb.com/) for the database

## 📞 Support

For support, email jesse@jessiedev.xyz or create an issue on GitHub.

---

**VidioX** - Built with ❤️ by [Jessie Borras](https://jessiedev.xyz)# video-streaming-service-with-encoding
