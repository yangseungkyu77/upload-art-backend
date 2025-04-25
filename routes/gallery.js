const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const router = express.Router();

// 🔐 Google OAuth 클라이언트 세팅
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// ✅ token.json 읽기
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
if (!fs.existsSync(TOKEN_PATH)) {
  console.error('❌ token.json 없음');
  process.exit(1);
}
oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')));
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// 📂 사용자 폴더 ID 조회
async function getUserFolderId(username) {
  const parentId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  const result = await drive.files.list({
    q: [
      `'${parentId}' in parents`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      `trashed = false`
    ].join(' and '),
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  const folder = result.data.files.find(f => f.name === username);
  if (!folder) return null;

  return folder.id;
}

// 📂 GET /api/gallery/:username
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const userFolderId = await getUserFolderId(username);
    if (!userFolderId) {
      return res.json({ success: true, urls: [], folderLink: "" });
    }

    const response = await drive.files.list({
      q: `'${userFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    const urls = response.data.files.map(file =>
      `https://drive.google.com/uc?export=view&id=${file.id}`
    );

    const folderLink = `https://drive.google.com/drive/folders/${userFolderId}`;

    res.json({ success: true, urls, folderLink }); // ✅ 폴더링크 포함해서 반환
  } catch (err) {
    console.error('❌ 갤러리 로딩 오류:', err.message);
    res.status(500).json({ success: false, message: '갤러리 로딩 실패' });
  }
});

module.exports = router;
