const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();

// ✅ Render 호환을 위한 동적 포트 설정
const PORT = process.env.PORT || 5001;

// ✅ CORS 허용 (Netlify 정식 도메인만)
const corsOptions = {
  origin: 'https://startling-meerkat-f970c5.netlify.app',
  methods: ['GET', 'POST'],
  credentials: false
};
app.use(cors(corsOptions));

// 📡 Middleware
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

// ❗ 글로벌 에러 핸들러 (500 문제 디버깅용)
app.use((err, req, res, next) => {
  console.error("🔥 서버 에러:", err.message);
  res.status(500).json({
    error: 'Internal Server Error',
    details: err.message
  });
});

// 🧿 서버 실행
app.listen(PORT, () => {
  console.log(`✅ 서버 실행중: http://localhost:${PORT}`);
});
