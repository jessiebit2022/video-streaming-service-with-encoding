import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Paper,
  TextField,
  Chip,
} from '@mui/material';
import { CloudUpload, VideoFile } from '@mui/icons-material';
import axios from 'axios';

interface UploadFile extends File {
  preview?: string;
}

const VideoUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const videoFiles = acceptedFiles.filter(file => 
      file.type.startsWith('video/')
    ).map(file => Object.assign(file, {
      preview: URL.createObjectURL(file)
    }));
    
    setUploadedFiles(videoFiles);
    setUploadStatus('idle');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv']
    },
    multiple: false,
    maxSize: 2147483648, // 2GB
  });

  const handleUpload = async () => {
    if (uploadedFiles.length === 0 || !title.trim()) {
      setUploadStatus('error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('video', uploadedFiles[0]);
    formData.append('title', title);
    formData.append('description', description);

    try {
      const response = await axios.post('http://localhost:3001/api/videos/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        },
      });

      setUploadStatus('success');
      setUploadedFiles([]);
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    if (newFiles[index].preview) {
      URL.revokeObjectURL(newFiles[index].preview!);
    }
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Upload Video
      </Typography>

      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.500',
          borderRadius: 2,
          textAlign: 'center',
          cursor: 'pointer',
          mb: 3,
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 60, mb: 2, color: 'primary.main' }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive
            ? 'Drop the video file here...'
            : 'Drag & drop a video file here, or click to select'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Supported formats: MP4, AVI, MOV, WMV, FLV, WebM, MKV (Max 2GB)
        </Typography>
      </Paper>

      {uploadedFiles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Files:
          </Typography>
          {uploadedFiles.map((file, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                border: 1,
                borderColor: 'grey.300',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <VideoFile sx={{ mr: 2, color: 'primary.main' }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1">{file.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                onClick={() => removeFile(index)}
                disabled={isUploading}
              >
                Remove
              </Button>
            </Box>
          ))}
        </Box>
      )}

      {uploadedFiles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Video Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            sx={{ mb: 2 }}
            disabled={isUploading}
          />
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            disabled={isUploading}
          />
        </Box>
      )}

      {isUploading && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Uploading... {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {uploadStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Video uploaded successfully! It will be processed and available for streaming soon.
        </Alert>
      )}

      {uploadStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Upload failed. Please check your file and try again.
        </Alert>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleUpload}
        disabled={uploadedFiles.length === 0 || !title.trim() || isUploading}
        sx={{ mb: 2 }}
      >
        {isUploading ? 'Uploading...' : 'Upload Video'}
      </Button>

      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          After upload, your video will be automatically processed into multiple formats
          for optimal streaming across different devices and network conditions.
        </Typography>
      </Box>
    </Box>
  );
};

export default VideoUpload;