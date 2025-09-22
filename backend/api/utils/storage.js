const AWS = require('aws-sdk');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const path = require('path');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to AWS S3
 * @param {string} filePath - Local file path
 * @param {string} s3Key - S3 object key
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<object>} Upload result
 */
const uploadToS3 = async (filePath, s3Key, bucket = process.env.S3_BUCKET) => {
  try {
    if (!process.env.AWS_ACCESS_KEY_ID || !bucket) {
      throw new Error('AWS S3 not configured');
    }

    const fileContent = fs.readFileSync(filePath);
    const contentType = getContentType(filePath);

    const params = {
      Bucket: bucket,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read', // Make files publicly accessible
    };

    const result = await s3.upload(params).promise();
    
    return {
      success: true,
      url: result.Location,
      key: result.Key,
      bucket: result.Bucket,
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Upload video to Cloudinary
 * @param {string} filePath - Local file path
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
const uploadToCloudinary = async (filePath, publicId, options = {}) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary not configured');
    }

    const defaultOptions = {
      public_id: publicId,
      resource_type: 'video',
      chunk_size: 20000000, // 20MB chunks
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, defaultOptions);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      duration: result.duration,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete file from S3
 * @param {string} s3Key - S3 object key
 * @param {string} bucket - S3 bucket name
 * @returns {Promise<object>} Delete result
 */
const deleteFromS3 = async (s3Key, bucket = process.env.S3_BUCKET) => {
  try {
    const params = {
      Bucket: bucket,
      Key: s3Key,
    };

    await s3.deleteObject(params).promise();
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {object} options - Delete options
 * @returns {Promise<object>} Delete result
 */
const deleteFromCloudinary = async (publicId, options = {}) => {
  try {
    const defaultOptions = {
      resource_type: 'video',
      ...options,
    };

    const result = await cloudinary.uploader.destroy(publicId, defaultOptions);
    
    return {
      success: result.result === 'ok',
      result: result.result,
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Generate signed URL for private S3 objects
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds
 * @param {string} bucket - S3 bucket name
 * @returns {string} Signed URL
 */
const getSignedUrl = (s3Key, expiresIn = 3600, bucket = process.env.S3_BUCKET) => {
  const params = {
    Bucket: bucket,
    Key: s3Key,
    Expires: expiresIn,
  };

  return s3.getSignedUrl('getObject', params);
};

/**
 * Get content type based on file extension
 * @param {string} filePath - File path
 * @returns {string} Content type
 */
const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
  };

  return contentTypes[ext] || 'application/octet-stream';
};

/**
 * Upload file to configured storage provider
 * @param {string} filePath - Local file path
 * @param {string} key - Storage key/public ID
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
const uploadFile = async (filePath, key, options = {}) => {
  // Prefer S3 if configured, fallback to Cloudinary
  if (process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET) {
    return await uploadToS3(filePath, key, options.bucket);
  } else if (process.env.CLOUDINARY_CLOUD_NAME) {
    return await uploadToCloudinary(filePath, key, options);
  } else {
    return {
      success: false,
      error: 'No storage provider configured',
    };
  }
};

/**
 * Delete file from configured storage provider
 * @param {string} key - Storage key/public ID
 * @param {object} options - Delete options
 * @returns {Promise<object>} Delete result
 */
const deleteFile = async (key, options = {}) => {
  // Try both providers to ensure cleanup
  const results = [];

  if (process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET) {
    results.push(await deleteFromS3(key, options.bucket));
  }

  if (process.env.CLOUDINARY_CLOUD_NAME) {
    results.push(await deleteFromCloudinary(key, options));
  }

  return {
    success: results.some(result => result.success),
    results,
  };
};

/**
 * Generate video streaming URLs for different qualities
 * @param {string} videoId - Video ID
 * @param {Array} formats - Available video formats
 * @returns {object} Streaming URLs
 */
const generateStreamingUrls = (videoId, formats) => {
  const streamingUrls = {};

  formats.forEach(format => {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET) {
      // Generate S3 URLs
      streamingUrls[format.quality] = {
        url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/videos/${videoId}_${format.quality}.mp4`,
        type: 'application/x-mpegURL', // For HLS streaming
      };
    } else if (process.env.CLOUDINARY_CLOUD_NAME) {
      // Generate Cloudinary URLs
      streamingUrls[format.quality] = {
        url: cloudinary.url(`${videoId}_${format.quality}`, {
          resource_type: 'video',
          format: 'mp4',
          quality: 'auto',
        }),
        type: 'video/mp4',
      };
    }
  });

  return streamingUrls;
};

module.exports = {
  uploadToS3,
  uploadToCloudinary,
  deleteFromS3,
  deleteFromCloudinary,
  uploadFile,
  deleteFile,
  getSignedUrl,
  generateStreamingUrls,
  getContentType,
};