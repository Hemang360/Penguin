import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
const api = axios.create({ baseURL })

export const health = () => api.get('/health').then(r => r.data)
export const verifyByKey = (key: string) => api.get('/verify', { params: { key } }).then(r => r.data)

export const createNode = (kind: string, author: string | undefined, body: any) =>
  api.post('/node', { kind, author, body }).then(r => r.data)

export default api

