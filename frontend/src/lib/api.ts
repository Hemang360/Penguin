import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
const api = axios.create({ baseURL })

export const health = () => api.get('/health').then(r => r.data)
export const verifyByKey = (key: string) => api.get('/verify', { params: { key } }).then(r => r.data)

export const createNode = (kind: string, author: string | undefined, body: any) =>
  api.post('/node', { kind, author, body }).then(r => r.data)

// Art generation endpoints
export const generateArt = (data: {
  user_id: string
  prompt: string
  content_type: string
  llm_provider: string
  parameters: Record<string, any>
}) => api.post('/generate', data).then(r => r.data)

export const importArt = (data: {
  user_id: string
  source_url: string
  content_type: string
  file_data: number[]
  prompt: string
  source_platform: string
  metadata: Record<string, any>
}) => api.post('/import', data).then(r => r.data)

export const getCertificate = (artworkId: string) =>
  api.get(`/certificate/${artworkId}`).then(r => r.data)

export default api

