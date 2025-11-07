import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8787'
const api = axios.create({ baseURL })

// Add request interceptor to include JWT token in Authorization header
api.interceptors.request.use(
  (config) => {
    // Public endpoints that don't require authentication
    // Check both url and the constructed full URL
    const url = config.url || ''
    const fullUrl = config.baseURL ? `${config.baseURL}${url}` : url
    const isPublicEndpoint = 
      url.includes('/verify') || 
      url.includes('/certificate') ||
      url.includes('/health') ||
      url.includes('/upload') ||
      url.includes('/manifests') ||
      fullUrl.includes('/verify') ||
      fullUrl.includes('/certificate') ||
      fullUrl.includes('/health')
    
    if (!isPublicEndpoint) {
      // Get token from localStorage (set by AuthContext)
      const token = localStorage.getItem('msal_access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } else {
      // Explicitly ensure no Authorization header for public endpoints
      if (config.headers) {
        delete config.headers.Authorization
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on 401 for public verification endpoints
      const isVerificationEndpoint = 
        error.config?.url?.includes('/verify') || 
        error.config?.url?.includes('/certificate')
      
      if (!isVerificationEndpoint) {
        // Token expired or invalid, clear it
        localStorage.removeItem('msal_access_token')
        localStorage.removeItem('msal_account')
        // Only redirect to login for protected endpoints
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export const health = () => api.get('/health').then(r => r.data)

// Verify by artwork ID (primary method for artwork verification)
export const verifyByArtworkId = (artworkId: string) => {
  // Clean the ID (remove /ipfs/ prefix, ipfs://, etc.)
  const cleanId = artworkId.replace(/^\/?ipfs\//, '').replace(/^ipfs:\/\//, '').trim()
  return api.get(`/verify/${cleanId}`).then(r => r.data)
}

// Legacy verify by key (for old node system)
export const verifyByKey = (key: string) => api.get('/verify', { params: { key } }).then(r => r.data)

// Verify by file upload
export const verifyByFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/verify/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}

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

