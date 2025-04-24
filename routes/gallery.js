// backend/routes/gallery.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const router = express.Router();

// 🔐 Google OAuth 클라이언트 세팅
const oauth2Client = new google.auth.OAuth2();
const TOKEN_PATH = '/etc/secrets/token.json';
oauth2Client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')));
const drive = google.drive({ version: 'v3', auth: oauth2Client });

// 📁 사용자 폴더 ID 조회
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

// 🔓 GET 방식으로 갤러리 이미지 목록 반환
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const userFolderId = await getUserFolderId(username);
    if (!userFolderId) return res.json({ success: true, urls: [] });

    const response = await drive.files.list({
      q: `'${userFolderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      spaces: 'drive'
    });

    const urls = response.data.files.map(file => ({
      name: file.name,
      url: `https://drive.google.com/uc?id=${file.id}`,
    }));

    res.json({ success: true, urls });
  } catch (err) {
    console.error('❌ 갤러리 로딩 오류:', err.message);
    res.status(500).json({ success: false, message: '갤러리 로딩 실패' });
  }
});

module.exports = router;
