import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
})

// Request interceptor: attach Bearer token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('voxnote_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// Response interceptor: on 401, clear auth state and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('voxnote_token')
      localStorage.removeItem('voxnote_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default apiClient
