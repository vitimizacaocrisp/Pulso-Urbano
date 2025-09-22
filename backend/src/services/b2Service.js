import BackblazeB2 from 'backblaze-b2';

const b2 = new BackblazeB2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APP_KEY
});

export async function uploadFileToB2(file) {
  await b2.authorize();
  const response = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID });
  const upload = await b2.uploadFile({
    uploadUrl: response.data.uploadUrl,
    uploadAuthToken: response.data.authorizationToken,
    fileName: file.originalname,
    data: file.buffer
  });
  return `https://f000.backblazeb2.com/file/${process.env.B2_BUCKET_NAME}/${file.originalname}`;
}

export async function deleteFileFromS3(fileUrl) {
  // Extrai o fileName da URL
  const fileName = fileUrl.split('/').pop();
  await b2.authorize();
  const file = await b2.listFileNames({ bucketId: process.env.B2_BUCKET_ID, startFileName: fileName, maxFileCount: 1 });
  if (file.data.files.length) {
    await b2.deleteFileVersion({ fileId: file.data.files[0].fileId, fileName });
  }
}

export async function listFilesB2() {
  await b2.authorize();
  const response = await b2.listFileNames({ bucketId: process.env.B2_BUCKET_ID });
  return response.data.files.map(f => f.fileName);
}
