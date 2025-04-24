const express = require('express');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const router = express.Router();

// 🔐 OAuth 클라이언트 설정
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// 🔁 인증 요청 라우트
router.get('/auth', (req, res) => {
    const scopes = ['https://www.googleapis.com/auth/drive.file'];

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });

    res.redirect(authUrl);
});

// 🔁 콜백 처리 라우트
router.get('/oauth2callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('코드가 없습니다.');

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // 📁 토큰 저장
        const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

        res.send('✅ 인증 완료! 이제 서버를 다시 시작하세요.');
    } catch (err) {
        console.error('❌ 인증 실패:', err);
        res.status(500).send('인증 처리 중 오류 발생');
    }
});

module.exports = router;
