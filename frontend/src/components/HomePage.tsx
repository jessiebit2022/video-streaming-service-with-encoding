import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { Upload, VideoLibrary, PlayArrow } from '@mui/icons-material';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h2" component="h1" gutterBottom align="center">
        Welcome to VidioX
      </Typography>
      <Typography variant="h5" component="p" gutterBottom align="center" color="text.secondary">
        Upload, encode, and stream your videos with professional quality
      </Typography>

      <Grid container spacing={4} sx={{ mt: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <Upload sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Upload Videos
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Upload your videos and let our system automatically encode them 
                into multiple formats for optimal streaming quality.
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/upload')}
              >
                Upload Now
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <VideoLibrary sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Video Library
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Browse through your uploaded videos, manage your content, 
                and see the encoding status of your uploads.
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/videos')}
              >
                Browse Videos
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
              <PlayArrow sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
              <Typography variant="h5" component="h2" gutterBottom>
                Stream & Watch
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Enjoy high-quality streaming with adaptive bitrate, 
                multiple resolution options, and seamless playback.
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => navigate('/videos')}
              >
                Start Watching
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;