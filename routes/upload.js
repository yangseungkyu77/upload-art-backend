const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config(); // ✅ .env 환경변수 로딩

// ✅ token.json 무조건 최신 환경변수로 재생성
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const tokenData = {
  access_token: process.env.GOOGLE_ACCESS_TOKEN,
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  scope: "https://www.googleapis.com/auth/drive.file",
  token_type: "Bearer",
  expiry_date: Date.now() + 1000 * 60 * 60 * 1 // 1시간
};
fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
console.log('🔄 token.json 생성됨 (항상 최신 환경변수 기반)');

// 🔐 Google OAuth2 클라이언트
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')));
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// ✅ 인증 상태 디버깅 출력
console.log("🧪 현재 OAuth2 인증 상태:");
console.log("🔑 access_token:", oauth2Client.credentials.access_token ? "존재함" : "❌ 없음");
console.log("🔁 refresh_token:", oauth2Client.credentials.refresh_token ? "존재함" : "❌ 없음");
console.log("⏰ expiry_date:", new Date(oauth2Client.credentials.expiry_date).toISOString());

// ⚙️ multer 설정
const upload = multer({ dest: 'uploads/' });

// 📁 유저 폴더 생성 or 조회
async function getOrCreateUserFolder(username) {
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const result = await drive.files.list({
    q: `'${parentId}' in parents and name='${username}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive'
  });

  if (result.data.files.length > 0) return result.data.files[0].id;

  const folderMetadata = {
    name: username,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };

  const folder = await drive.files.create({
    resource: folderMetadata,
    fields: 'id'
  });

  return folder.data.id;
}

// 🚀 업로드 라우트
router.post('/upload', upload.array('images'), async (req, res) => {
  const { name } = req.body;
  const files = req.files;

  console.log("🔥 업로드 요청:", name);

  if (!name || !files || files.length === 0) {
    return res.status(400).json({ success: false, message: '이름과 이미지가 필요합니다.' });
  }

  try {
    const folderId = await getOrCreateUserFolder(name);
    const successList = [];
    const failList = [];

    for (const file of files) {
      try {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const metadata = { name: originalName, parents: [folderId] };
        const media = {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path)
        };

        const uploadRes = await drive.files.create({
          resource: metadata,
          media,
          fields: 'id'
        });

        const fileId = uploadRes.data.id;

        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' }
        });

        const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        successList.push(originalName);
        console.log(`✅ ${originalName} 업로드 완료: ${publicUrl}`);
      } catch (err) {
        console.error(`❌ 파일 업로드 실패: ${file.originalname}`, err.message);
        console.error('📛 상세 오류:', err.stack);
        failList.push(file.originalname);
      } finally {
        fs.unlinkSync(file.path);
      }
    }

    if (successList.length === 0) {
      return res.status(500).json({
        success: false,
        message: '업로드 실패 (모든 파일 오류)',
        successList,
        failList
      });
    }

    return res.json({ success: true, successList, failList });

  } catch (err) {
    console.error('❌ 전체 업로드 실패:', err.message);
    console.error('📛 전체 스택:', err.stack);
    res.status(500).json({
      success: false,
      message: '업로드 처리 중 오류 발생',
      error: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;
