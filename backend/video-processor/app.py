#!/usr/bin/env python3
"""
VidioX Video Processing Service
Flask application for video encoding and processing using FFmpeg
"""

import os
import json
import uuid
import subprocess
import threading
from datetime import datetime
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS
import redis
import boto3
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = '/tmp/uploads'
PROCESSED_FOLDER = '/tmp/processed'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'}

# Ensure directories exist
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
Path(PROCESSED_FOLDER).mkdir(parents=True, exist_ok=True)

# Redis connection for job queue
try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
except:
    print("Warning: Redis not available. Job queue functionality will be limited.")
    redis_client = None

# AWS S3 client (optional)
try:
    s3_client = boto3.client('s3')
    S3_BUCKET = os.getenv('S3_BUCKET', 'vidiox-videos')
except:
    s3_client = None
    print("Warning: AWS S3 not configured. Local storage will be used.")

# Video encoding profiles
ENCODING_PROFILES = {
    '240p': {
        'resolution': '426x240',
        'video_bitrate': '400k',
        'audio_bitrate': '64k',
        'fps': 30
    },
    '360p': {
        'resolution': '640x360',
        'video_bitrate': '800k',
        'audio_bitrate': '96k',
        'fps': 30
    },
    '480p': {
        'resolution': '854x480',
        'video_bitrate': '1200k',
        'audio_bitrate': '128k',
        'fps': 30
    },
    '720p': {
        'resolution': '1280x720',
        'video_bitrate': '2500k',
        'audio_bitrate': '192k',
        'fps': 30
    },
    '1080p': {
        'resolution': '1920x1080',
        'video_bitrate': '5000k',
        'audio_bitrate': '256k',
        'fps': 30
    }
}

def allowed_file(filename):
    """Check if the file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_video_info(filepath):
    """Get video metadata using FFprobe."""
    cmd = [
        'ffprobe', 
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filepath
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error getting video info: {e}")
        return None

def create_thumbnail(input_path, output_path, timestamp='00:00:01'):
    """Generate a thumbnail from the video."""
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-ss', timestamp,
        '-vframes', '1',
        '-q:v', '2',
        '-y',
        output_path
    ]
    
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error creating thumbnail: {e}")
        return False

def encode_video(input_path, output_path, profile):
    """Encode video using FFmpeg with the specified profile."""
    cmd = [
        'ffmpeg',
        '-i', input_path,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-s', profile['resolution'],
        '-b:v', profile['video_bitrate'],
        '-c:a', 'aac',
        '-b:a', profile['audio_bitrate'],
        '-r', str(profile['fps']),
        '-movflags', '+faststart',
        '-y',
        output_path
    ]
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error encoding video: {e}")
        return False

def process_video_job(job_data):
    """Process a video encoding job."""
    job_id = job_data['job_id']
    input_path = job_data['input_path']
    video_id = job_data['video_id']
    
    try:
        # Update job status
        update_job_status(job_id, 'processing', 'Starting video processing')
        
        # Get video information
        video_info = get_video_info(input_path)
        if not video_info:
            update_job_status(job_id, 'error', 'Failed to get video information')
            return
        
        # Extract video metadata
        video_stream = next((s for s in video_info['streams'] if s['codec_type'] == 'video'), None)
        audio_stream = next((s for s in video_info['streams'] if s['codec_type'] == 'audio'), None)
        
        if not video_stream:
            update_job_status(job_id, 'error', 'No video stream found')
            return
        
        # Determine which profiles to encode based on input resolution
        input_width = int(video_stream.get('width', 0))
        input_height = int(video_stream.get('height', 0))
        
        # Select appropriate profiles
        profiles_to_encode = []
        for quality, profile in ENCODING_PROFILES.items():
            profile_width, profile_height = map(int, profile['resolution'].split('x'))
            if profile_height <= input_height:
                profiles_to_encode.append((quality, profile))
        
        if not profiles_to_encode:
            # If input is very low resolution, use the lowest profile
            profiles_to_encode = [('240p', ENCODING_PROFILES['240p'])]
        
        # Create thumbnail
        thumbnail_path = os.path.join(PROCESSED_FOLDER, f"{video_id}_thumbnail.jpg")
        create_thumbnail(input_path, thumbnail_path)
        
        # Encode videos
        encoded_files = []
        total_profiles = len(profiles_to_encode)
        
        for i, (quality, profile) in enumerate(profiles_to_encode):
            update_job_status(job_id, 'processing', f'Encoding {quality} ({i+1}/{total_profiles})')
            
            output_filename = f"{video_id}_{quality}.mp4"
            output_path = os.path.join(PROCESSED_FOLDER, output_filename)
            
            if encode_video(input_path, output_path, profile):
                file_size = os.path.getsize(output_path)
                encoded_files.append({
                    'quality': quality,
                    'filename': output_filename,
                    'path': output_path,
                    'size': file_size,
                    'bitrate': int(profile['video_bitrate'].rstrip('k')) * 1000
                })
            else:
                print(f"Failed to encode {quality} for video {video_id}")
        
        if not encoded_files:
            update_job_status(job_id, 'error', 'Failed to encode any video formats')
            return
        
        # Upload to cloud storage if available
        if s3_client:
            update_job_status(job_id, 'processing', 'Uploading to cloud storage')
            for encoded_file in encoded_files:
                upload_to_s3(encoded_file['path'], f"videos/{encoded_file['filename']}")
                encoded_file['url'] = f"https://{S3_BUCKET}.s3.amazonaws.com/videos/{encoded_file['filename']}"
            
            # Upload thumbnail
            if os.path.exists(thumbnail_path):
                upload_to_s3(thumbnail_path, f"thumbnails/{video_id}_thumbnail.jpg")
                thumbnail_url = f"https://{S3_BUCKET}.s3.amazonaws.com/thumbnails/{video_id}_thumbnail.jpg"
            else:
                thumbnail_url = None
        else:
            # Use local URLs
            for encoded_file in encoded_files:
                encoded_file['url'] = f"http://localhost:5000/processed/{encoded_file['filename']}"
            thumbnail_url = f"http://localhost:5000/processed/{video_id}_thumbnail.jpg" if os.path.exists(thumbnail_path) else None
        
        # Update job with results
        result_data = {
            'encoded_files': encoded_files,
            'thumbnail_url': thumbnail_url,
            'duration': float(video_info['format'].get('duration', 0)),
            'video_info': {
                'width': input_width,
                'height': input_height,
                'codec': video_stream.get('codec_name'),
                'fps': eval(video_stream.get('r_frame_rate', '30/1'))
            }
        }
        
        update_job_status(job_id, 'completed', 'Video processing completed successfully', result_data)
        
        # Clean up input file
        os.remove(input_path)
        
    except Exception as e:
        update_job_status(job_id, 'error', f'Unexpected error: {str(e)}')
        print(f"Error processing video job {job_id}: {e}")

def upload_to_s3(local_path, s3_key):
    """Upload file to S3."""
    try:
        s3_client.upload_file(local_path, S3_BUCKET, s3_key)
        return True
    except Exception as e:
        print(f"Error uploading to S3: {e}")
        return False

def update_job_status(job_id, status, message, data=None):
    """Update job status in Redis."""
    if not redis_client:
        print(f"Job {job_id}: {status} - {message}")
        return
    
    job_data = {
        'status': status,
        'message': message,
        'updated_at': datetime.now().isoformat()
    }
    
    if data:
        job_data['data'] = data
    
    redis_client.hmset(f"job:{job_id}", job_data)
    redis_client.expire(f"job:{job_id}", 3600)  # Expire after 1 hour

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'video-processor'})

@app.route('/process', methods=['POST'])
def process_video():
    """Start video processing job."""
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        file = request.files['video']
        if file.filename == '' or not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file'}), 400
        
        # Generate unique identifiers
        job_id = str(uuid.uuid4())
        video_id = str(uuid.uuid4())
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        file_extension = filename.rsplit('.', 1)[1].lower()
        input_filename = f"{video_id}_original.{file_extension}"
        input_path = os.path.join(UPLOAD_FOLDER, input_filename)
        file.save(input_path)
        
        # Create job data
        job_data = {
            'job_id': job_id,
            'video_id': video_id,
            'input_path': input_path,
            'original_filename': filename,
            'created_at': datetime.now().isoformat()
        }
        
        # Start processing in background thread
        thread = threading.Thread(target=process_video_job, args=(job_data,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'job_id': job_id,
            'video_id': video_id,
            'status': 'queued',
            'message': 'Video processing job started'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/job/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status and results."""
    if not redis_client:
        return jsonify({'error': 'Job tracking not available'}), 503
    
    job_data = redis_client.hgetall(f"job:{job_id}")
    if not job_data:
        return jsonify({'error': 'Job not found'}), 404
    
    return jsonify(job_data)

@app.route('/processed/<filename>')
def serve_processed_file(filename):
    """Serve processed video files."""
    return app.send_static_file(os.path.join(PROCESSED_FOLDER, filename))

if __name__ == '__main__':
    # Check for FFmpeg
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        print("FFmpeg found")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("ERROR: FFmpeg not found. Please install FFmpeg.")
        exit(1)
    
    print("Starting VidioX Video Processing Service...")
    app.run(host='0.0.0.0', port=5000, debug=True)