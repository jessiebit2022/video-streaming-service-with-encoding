import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { ArrowBack, Settings } from '@mui/icons-material';
import ReactPlayer from 'react-player';
import axios from 'axios';

interface VideoFormat {
  quality: string;
  url: string;
  size: number;
  bitrate?: number;
}

interface VideoData {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  duration?: number;
  status: string;
  createdAt: string;
  formats: VideoFormat[];
}

const VideoPlayer: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (videoId) {
      fetchVideo(videoId);
    }
  }, [videoId]);

  const fetchVideo = async (id: string) => {
    try {
      const response = await axios.get(`http://localhost:3001/api/videos/${id}`);
      const videoData = response.data;
      setVideo(videoData);
      
      // Set default quality (highest available)
      if (videoData.formats && videoData.formats.length > 0) {
        const sortedFormats = videoData.formats.sort((a: VideoFormat, b: VideoFormat) => {
          const aResolution = parseInt(a.quality.replace('p', ''));
          const bResolution = parseInt(b.quality.replace('p', ''));
          return bResolution - aResolution;
        });
        setSelectedQuality(sortedFormats[0].quality);
      }
    } catch (err) {
      setError('Failed to load video');
      console.error('Error fetching video:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedVideoUrl = () => {
    if (!video || !selectedQuality) return '';
    const format = video.formats.find(f => f.quality === selectedQuality);
    return format?.url || '';
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !video) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error || 'Video not found'}
      </Alert>
    );
  }

  if (video.status !== 'ready') {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          This video is still being processed. Please check back later.
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/videos')}
        >
          Back to Videos
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        variant="text"
        startIcon={<ArrowBack />}
        onClick={() => navigate('/videos')}
        sx={{ mb: 2 }}
      >
        Back to Videos
      </Button>

      <Paper sx={{ p: 0, mb: 3, overflow: 'hidden' }}>
        <Box sx={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000' }}>
          <ReactPlayer
            url={getSelectedVideoUrl()}
            playing={isPlaying}
            controls
            width="100%"
            height="100%"
            style={{ position: 'absolute', top: 0, left: 0 }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            config={{
              file: {
                attributes: {
                  crossOrigin: 'anonymous',
                },
              },
            }}
          />
        </Box>

        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" component="h1" gutterBottom>
                {video.title}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Uploaded: {new Date(video.createdAt).toLocaleDateString()}
                {video.duration && ` • Duration: ${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}`}
              </Typography>
            </Box>

            {video.formats && video.formats.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 120, ml: 2 }}>
                <InputLabel>Quality</InputLabel>
                <Select
                  value={selectedQuality}
                  label="Quality"
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  startAdornment={<Settings sx={{ mr: 1, fontSize: '1rem' }} />}
                >
                  {video.formats
                    .sort((a, b) => {
                      const aResolution = parseInt(a.quality.replace('p', ''));
                      const bResolution = parseInt(b.quality.replace('p', ''));
                      return bResolution - aResolution;
                    })
                    .map((format) => (
                      <MenuItem key={format.quality} value={format.quality}>
                        {format.quality}
                        {format.bitrate && ` (${Math.round(format.bitrate / 1000)}kbps)`}
                        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                          {formatFileSize(format.size)}
                        </Typography>
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </Box>

          {video.description && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {video.description}
              </Typography>
            </Box>
          )}

          {video.formats && video.formats.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Available Formats
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {video.formats.map((format) => (
                  <Paper
                    key={format.quality}
                    variant="outlined"
                    sx={{
                      p: 2,
                      minWidth: 120,
                      textAlign: 'center',
                      backgroundColor: selectedQuality === format.quality ? 'primary.main' : 'background.paper',
                      color: selectedQuality === format.quality ? 'primary.contrastText' : 'text.primary',
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      {format.quality}
                    </Typography>
                    <Typography variant="caption" display="block">
                      {formatFileSize(format.size)}
                    </Typography>
                    {format.bitrate && (
                      <Typography variant="caption" display="block">
                        {Math.round(format.bitrate / 1000)}kbps
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default VideoPlayer;