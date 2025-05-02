// token-gen.js
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    '558571595197-ui7d1v2bdniagtvec953atibtt1c2uqt.apps.googleusercontent.com',
    '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',
    'https://developers.google.com/oauthplayground'
);

const code = '4/0Ab_5qllIFrJNIGiOsX_J--giGKdkOlfZnR-5y8NX3kKhBID3Mw6WAwCLInT8-n8iAxFyHA';

oauth2Client.getToken(code)
    .then(({ tokens }) => {
        console.log('✅ 새로운 토큰 발급 성공!');
        console.log('access_token:', tokens.access_token);
        console.log('refresh_token:', tokens.refresh_token);
        console.log('expiry_date:', tokens.expiry_date);
    })
    .catch(err => {
        console.error('❌ 토큰 발급 실패:', err.message);
    });
