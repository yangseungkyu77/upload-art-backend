const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// 🔐 Google OAuth2 클라이언트
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 📁 토큰 세팅
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
if (!fs.existsSync(TOKEN_PATH)) {
  console.error('❌ token.json 없음. 먼저 인증을 완료하세요.');
  process.exit(1);
}
oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')));
const drive = google.drive({ version: 'v3', auth: oauth2Client });

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

  if (result.data.files.length > 0) {
    return result.data.files[0].id;
  }

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
    return res.status(400).json({ error: '이름과 이미지가 필요합니다.' });
  }

  try {
    const folderId = await getOrCreateUserFolder(name);
    const urls = [];

    for (const file of files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

      const metadata = {
        name: originalName,
        parents: [folderId]
      };

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
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      urls.push(publicUrl);

      fs.unlinkSync(file.path);
      console.log(`✅ ${originalName} 업로드 완료: ${publicUrl}`);
    }

    res.json({ success: true, urls });

  } catch (err) {
    console.error('❌ 업로드 실패:', err.message);
    res.status(500).json({ success: false, message: '업로드 중 오류 발생' });
  }
});

module.exports = router;
