// frontend/services/b2Services.js
export async function uploadFile(file) {
  const token = localStorage.getItem('authToken');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('http://localhost:3000/api/b2/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Falha no upload');
  return data.url;
}

export async function deleteFile(fileUrl) {
  const token = localStorage.getItem('authToken');
  const res = await fetch('http://localhost:3000/api/b2/delete', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileUrl })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Falha ao deletar arquivo');
  return data;
}

export async function listFiles() {
  const token = localStorage.getItem('authToken');
  const res = await fetch('http://localhost:3000/api/b2/list', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Falha ao listar arquivos');
  return data.files;
}
