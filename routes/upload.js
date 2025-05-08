const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const dotenv = require('dotenv');
dotenv.config();

const upload = multer({ dest: 'uploads/' });

// 🔐 OAuth2 클라이언트 설정
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// 🧠 최신 access_token 기반 Google Drive 클라이언트 생성
async function getDriveClient() {
  await oauth2Client.getAccessToken(); // access_token 자동 재발급
  return google.drive({ version: 'v3', auth: oauth2Client });
}

// 📁 유저 폴더 생성 or 조회
async function getOrCreateUserFolder(drive, username) {
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
    const drive = await getDriveClient(); // 최신 토큰 기반 클라이언트

    const folderId = await getOrCreateUserFolder(drive, name);
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
    res.status(500).json({
      success: false,
      message: '업로드 처리 중 오류 발생',
      error: err.message
    });
  }
});

module.exports = router;
