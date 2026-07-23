# FileShare

> 🚧 **Work in Progress**
>
> The core functionality is complete. I'm currently refining the frontend JavaScript, improving the UI/UX, and adding additional production-ready features.

A production-oriented **real-time file sharing platform** built with **Node.js, Express, PostgreSQL, Socket.io, and Backblaze B2**.

Upload files, generate a secure **6-digit share code**, and share them with anyone.  making file sharing quick and simple while maintaining security.

🌐 **Live Demo**

https://fileshare-aho6.onrender.com

---

# ✨ Features

* 📤 Drag-and-drop file uploads
* 🔑 Secure 6-digit share codes
* ⚡ Real-time updates with Socket.io
* ☁️ Cloud file storage using Backblaze B2
* 🔐 JWT-based authentication
* 📊 User storage quotas
* 📱 Responsive interface
* 📈 Upload progress indicator
* 📂 File management dashboard
* ⏳ Configurable expiration time
* 🔢 Configurable download limits

---

# 🔒 Security

Security was a major focus while building this project.

* ✅ Magic Byte Validation (verifies actual file contents instead of trusting extensions)
* ✅ JWT Authentication
* ✅ Password hashing using bcrypt
* ✅ Rate-limited public endpoints
* ✅ Secure file streaming
* ✅ Input validation
* ✅ Protected API routes

---

# 🛠 Tech Stack

## Backend

* Node.js
* Express.js
* PostgreSQL (Supabase)
* Socket.io
* Backblaze B2 (S3 Compatible)
* JWT
* bcrypt
* Multer

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript

## Deployment

* Render
* Supabase
* Backblaze B2

---

# 📸 Screenshots

| Login                      | Upload                         |
| -------------------------- | ------------------------------ |
| ![](screenshots/Login.png) | ![](screenshots/shareCons.png) |

| Dashboard                      | Share Code                 |
| ------------------------------ | -------------------------- |
| ![](screenshots/dashboard.png) | ![](screenshots/share.png) |

| Download                      |
| ----------------------------- |
| ![](screenshots/download.png) |

---

# 🚀 Getting Started

## Clone the repository

```bash
git clone https://github.com/MANIKANT-GIT03/Real-time-FileShare
```

```bash
cd Real-time-FileShare
```

## Install dependencies

```bash
npm install
```

## Configure environment variables

Create a `.env` file and add the required credentials for:

* PostgreSQL
* JWT Secret
* Backblaze B2
* Application configuration

## Run the database schema

Execute the SQL schema in your PostgreSQL database.

## Start the server

```bash
node server.js
```

The application will be available at:

```
http://localhost:3000
```

---

# 📄 Typical Workflow

### As a User

1. Create an account or log in.
2. Drag and drop a file into the upload area.
3. Track upload progress.
4. Configure expiration time and maximum downloads.
5. Generate a secure 6-digit share code.
6. Share the code with anyone.
7. The recipient enters the code and downloads the file.

---

### As a Developer

1. Clone the repository.
2. Install dependencies.
3. Configure the environment variables.
4. Run the database schema.
5. Start the server.
6. Upload a file.
7. Generate a share code.
8. Download it from another browser session.
9. Watch real-time updates through Socket.io.

---

# 🎯 Why This Project?

Many file-sharing tutorials stop after saving files locally.

This project was built to demonstrate backend engineering concepts commonly used in production applications, including:

* Database transactions
* Secure authentication
* Cloud object storage
* Streaming uploads and downloads
* Real-time communication using WebSockets
* Rate limiting
* File validation
* Modular service architecture
* Stateless backend design

---

# 📂 Project Structure

```
FileShare/
│
├── controllers/
├── middleware/
├── routes/
├── services/
├── uploads/
├── screenshots/
├── public/
├── db.js
├── server.js
├── package.json
└── README.md
```

---

# 🚀 Future Improvements

* Redis adapter for Socket.io scaling
* Presigned Backblaze B2 download URLs
* File versioning
* Soft delete / Trash bin
* Email sharing
* File previews
* Admin dashboard
* Multiple file uploads
* Folder sharing
* User profile management

---

# 👨‍💻 Author

**Manikant**

GitHub: https://github.com/MANIKANT-GIT03

---

# 🏗 Deployment

* **Application:** Render
* **Database:** Supabase PostgreSQL
* **Object Storage:** Backblaze B2

---

## ⭐ If you found this project interesting, consider giving it a star!
