import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { PlayArrow, Schedule, CheckCircle, Error } from '@mui/icons-material';
import axios from 'axios';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  duration?: number;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
  formats: {
    quality: string;
    url: string;
    size: number;
  }[];
}

const VideoList: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/videos');
      setVideos(response.data);
    } catch (err) {
      setError('Failed to fetch videos');
      console.error('Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Schedule color="warning" />;
      case 'ready':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Schedule />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'warning';
      case 'ready':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Video Library
      </Typography>

      {videos.length === 0 ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No videos uploaded yet
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/upload')}
            sx={{ mt: 2 }}
          >
            Upload Your First Video
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {videos.map((video) => (
            <Grid item xs={12} sm={6} md={4} key={video.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="div"
                  sx={{
                    height: 180,
                    backgroundColor: 'grey.800',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    <PlayArrow sx={{ fontSize: 60, color: 'grey.400' }} />
                  )}
                  
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                    }}
                  >
                    <Chip
                      icon={getStatusIcon(video.status)}
                      label={video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                      color={getStatusColor(video.status) as any}
                      size="small"
                    />
                  </Box>

                  {video.duration && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                      }}
                    >
                      {formatDuration(video.duration)}
                    </Box>
                  )}
                </CardMedia>

                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom noWrap>
                    {video.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {video.description || 'No description provided'}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Uploaded: {new Date(video.createdAt).toLocaleDateString()}
                  </Typography>
                  {video.formats && video.formats.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Available qualities: {video.formats.map(f => f.quality).join(', ')}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                <CardActions>
                  {video.status === 'ready' ? (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayArrow />}
                      onClick={() => navigate(`/watch/${video.id}`)}
                      fullWidth
                    >
                      Watch Now
                    </Button>
                  ) : video.status === 'processing' ? (
                    <Button size="small" disabled fullWidth>
                      Processing...
                    </Button>
                  ) : (
                    <Button size="small" disabled fullWidth>
                      Processing Failed
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default VideoList;