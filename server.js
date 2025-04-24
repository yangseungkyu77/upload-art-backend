// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = 5001;

// 📡 Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 기본 라우트
app.get('/', (req, res) => {
  res.send('✅ 서버 정상 작동 중');
});

// 🧩 라우터 연결
const galleryRoutes = require('./routes/gallery');
app.use('/api/gallery', galleryRoutes);

const uploadRoutes = require('./routes/upload');
app.use('/api', uploadRoutes);

const oauthRoutes = require('./routes/oauth');
app.use('/api/oauth', oauthRoutes);

// 🧿 서버 실행
app.listen(PORT, () => {
  console.log(`✅ 서버 실행중: http://localhost:${PORT}`);
});
