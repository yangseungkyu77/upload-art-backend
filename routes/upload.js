const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// 🔐 Google OAuth2 클라이언트
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 🔑 token.json 로드
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
if (!fs.existsSync(TOKEN_PATH)) {
  console.error('❌ token.json 없음');
  process.exit(1);
}
oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')));
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// 📂 사용자 이름 폴더 기반 이미지 조회
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // 📁 사용자 폴더 조회
    const folderList = await drive.files.list({
      q: `'${parentId}' in parents and name='${username}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (folderList.data.files.length === 0) {
      return res.status(404).json({ success: false, message: '해당 이름의 폴더가 없습니다.' });
    }

    const folderId = folderList.data.files[0].id;

    // 🖼️ 폴더 내 이미지 검색
    const imageList = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const urls = imageList.data.files.map(file =>
      `https://drive.google.com/uc?export=view&id=${file.id}`
    );

    return res.json({ success: true, urls });

  } catch (err) {
    console.error('❌ 갤러리 조회 오류:', err.message);
    return res.status(500).json({ success: false, message: '서버 오류: 갤러리를 불러오지 못했습니다.' });
  }
});

module.exports = router;
