import axios from 'axios' // PUT direto ao R2 (URL pré-assinada, cross-origin)
import api from '@/services/api'

export interface MediaUploadFile {
  file: File
  category: string
  tempId: string
}

// Fluxo de upload compartilhado por ContentManagerView e EditAnalysisView:
//   1. pede URLs pré-assinadas ao backend (/generate-upload-urls)
//   2. faz PUT de cada arquivo direto no R2 (sem credenciais nossas)
//   3. devolve um mapa { tempId -> publicUrl }
export function useMediaUpload() {
  async function uploadFiles(files: MediaUploadFile[]): Promise<Record<string, string>> {
    const uploaded: Record<string, string> = {}
    if (!files || files.length === 0) return uploaded

    const { data: urlRes } = await api.post('/api/admin/generate-upload-urls', {
      files: files.map((f) => ({
        fileName: f.file.name,
        fileType: f.file.type,
        fileSize: f.file.size,
        category: f.category || 'image',
        tempId: f.tempId,
      })),
    })

    await Promise.all(urlRes.data.map(async (plan: { tempId: string; uploadUrl: string; publicUrl: string }) => {
      const fo = files.find((f) => f.tempId === plan.tempId)
      if (!fo) return
      await axios.put(plan.uploadUrl, fo.file, {
        headers: { 'Content-Type': fo.file.type || 'application/octet-stream' },
        withCredentials: false,
      })
      uploaded[plan.tempId] = plan.publicUrl
    }))

    return uploaded
  }

  return { uploadFiles }
}
