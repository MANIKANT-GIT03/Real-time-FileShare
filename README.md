Work in progress
writing the js for this project is sucking my life

FileShare

A real-time file sharing app. Upload files, get a 6-digit code, share it with anyone. 

Built as a portfolio project to demonstrate full-stack backend skills: 

Visit: https://fileshare-aho6.onrender.com

✨ Features
📤 Upload files with drag-and-drop support
🔑 Generate secure 6-digit share codes
⚡ Real-time updates using Socket.io
☁️ Cloud object storage (Backblaze B2)
🔐 JWT authentication
📊 User storage quotas

🔒 Security Features
Magic Byte Validation
Files are validated using their actual binary signature instead of trusting file extensions.

🚦 Rate-limited public endpoints
📈 Upload progress indicators
📱 Responsive UI

🛠 Tech Stack
Backend
Node.js
Express.js
PostgreSQL (Supabase)
Socket.io
Backblaze B2 (S3 Compatible)
JWT Authentication
bcrypt
Multer

Frontend
HTML
CSS
Vanilla JavaScript

Deployment
Render
Supabase
Backblaze B2

🎯 Why This Project?

Many file-sharing tutorials stop after storing files locally.

This project focuses on production-oriented backend engineering by demonstrating:

Database transactions
Secure authentication
Cloud object storage
Streaming uploads/downloads
WebSockets
Rate limiting
Input validation
Modular service architecture
Stateless backend design

## 📸 Screenshots

| Home | set expiry & download count |
|------|--------|
| ![Login](screenshots/Login.png) | ![Upload](screenshots/shareCOns.png) |

| Dashboard | Share Code |
|-----------|------------|
| ![Dashboard](screenshots/dashboard.png) | ![Share](screenshots/share.png) |

| Download | 
|----------|-------------------|
| ![Download](screenshots/download.png) | 

📄 Typical Workflow
As a Developer
Clone, npm install, create .env
Run schema in Supabase SQL Editor
node server.js — server starts on :3000
Open browser, sign up via the auth form
Drag a file onto the upload zone
Click Share → copy the 6-digit code
Open incognito window, redeem the code, download
Watch the toast appear in the original window
As a User
Sign up / log in
Drag files onto the upload zone (progress bar animates)
Files appear in a responsive grid with type icons
Click Share on any file → get a 6-digit code
Text the code to a friend
Friend enters code, sees file metadata, downloads
Code expires after 30 minutes (or max downloads reached)


🚀 Future Improvements
Redis adapter for Socket.io (scale across multiple Render instances)
Presigned download URLs (skip the Express stream, let B2 handle it)
File versioning (schema supports it — add file_versions table)
Soft delete / trash bin (deleted_at column, filter in queries)

👨‍💻 Author

Built by Manikant as a portfolio project.
https://github.com/MANIKANT-GIT03

Deployed on: Render
Database: Supabase
Object Storage: Backblaze B2

