const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

// 🔐 OAuth2 클라이언트 설정
const CREDENTIALS_PATH = path.join(__dirname, '../config/credentials.json'); // 다운받은 JSON 저장경로
const TOKEN_PATH = path.join(__dirname, '../config/token.json'); // 인증 토큰 저장위치

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getOAuth2Client() {
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0] // 리디렉션 URI와 동일해야 함
    );

    // 기존 토큰이 있으면 설정
    if (fs.existsSync(TOKEN_PATH)) {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
        oAuth2Client.setCredentials(token);
    }

    return oAuth2Client;
}

module.exports = { getOAuth2Client, SCOPES };
