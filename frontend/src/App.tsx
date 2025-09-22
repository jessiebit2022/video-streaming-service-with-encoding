import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, Toolbar, Typography, Container } from '@mui/material';
import HomePage from './components/HomePage';
import VideoUpload from './components/VideoUpload';
import VideoList from './components/VideoList';
import VideoPlayer from './components/VideoPlayer';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#e50914',
    },
    background: {
      default: '#141414',
      paper: '#1e1e1e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                VidioX
              </Typography>
            </Toolbar>
          </AppBar>
          
          <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/upload" element={<VideoUpload />} />
              <Route path="/videos" element={<VideoList />} />
              <Route path="/watch/:videoId" element={<VideoPlayer />} />
            </Routes>
          </Container>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
