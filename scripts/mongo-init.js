// MongoDB initialization script for VidioX
db = db.getSiblingDB('vidiox');

// Create collections
db.createCollection('videos');

// Create indexes for better performance
db.videos.createIndex({ "id": 1 }, { unique: true });
db.videos.createIndex({ "status": 1 });
db.videos.createIndex({ "createdAt": -1 });
db.videos.createIndex({ "title": "text", "description": "text" });

print("VidioX database initialized successfully!");