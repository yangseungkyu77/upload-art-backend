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
          requestBody: { role: 'reader', type: 'anyone' }
        });

        const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        successList.push(originalName);

        console.log(`✅ ${originalName} 업로드 완료: ${publicUrl}`);
      } catch (err) {
        console.error(`❌ 파일 업로드 실패: ${file.originalname}`, err.message);
        failList.push(file.originalname);
      } finally {
        fs.unlinkSync(file.path); // 임시 파일 제거
      }
    }

    if (successList.length === 0) {
      return res.status(500).json({ success: false, message: '업로드 실패 (모든 파일 오류)', successList, failList });
    }

    return res.json({ success: true, successList, failList });

  } catch (err) {
    console.error('❌ 전체 업로드 실패:', err.message);
    res.status(500).json({ success: false, message: '업로드 처리 중 오류 발생' });
  }
});
