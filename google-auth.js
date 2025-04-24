// backend/google-auth.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

// 🔑 경로 설정
const CREDENTIALS_PATH = path.join(__dirname, 'config', 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// 🔒 Google Drive 권한 범위
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// 🔐 credentials 로드 및 인증 실행
fs.readFile(CREDENTIALS_PATH, (err, content) => {
    if (err) return console.error('❌ 클라이언트 시크릿 파일 로드 실패:', err);
    authorize(JSON.parse(content), getAccessToken);
});

function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // 기존 토큰 있으면 인증 생략
    if (fs.existsSync(TOKEN_PATH)) {
        console.log('✅ token.json 이미 존재합니다.');
        return;
    }

    callback(oAuth2Client);
}

function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('\n🔗 아래 URL을 브라우저에 복사해 인증 후 코드를 입력하세요:\n');
    console.log(authUrl, '\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('👉 인증 코드 입력: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('❌ 토큰 가져오기 실패:', err);
            oAuth2Client.setCredentials(token);
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            console.log('✅ token.json 저장 완료');
        });
    });
}
