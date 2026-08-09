import type {
  AuthSession, CheckSheetErrorsResult, CheckSourceSheetColumnsResult, ColumnDefaults, CopySourceSheetInput,
  CopySourceSheetResult, GoogleSheetConfig, GoogleSheetNames,
  SourceColumnConfig, UnitRule, DocumentComparisonResult,
} from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const AUTH_STORAGE_KEY = 'excelflow.auth'

const readSession = (): AuthSession | null => {
  try {
    const value = localStorage.getItem(AUTH_STORAGE_KEY)
    return value ? JSON.parse(value) as AuthSession : null
  } catch {
    return null
  }
}

const saveSession = (session: AuthSession) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

const clearSession = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  window.dispatchEvent(new Event('excelflow:auth-expired'))
}

const actionByPath = (path: string) => {
  if (path.startsWith('/auth/login')) return 'đăng nhập'
  if (path.startsWith('/auth/refresh')) return 'làm mới phiên đăng nhập'
  if (path.startsWith('/google-sheet-config')) return 'cập nhật kết nối Google Sheet'
  if (path.startsWith('/copy-source-sheet')) return 'sao chép dữ liệu'
  if (path.startsWith('/check-sheet-errors')) return 'kiểm tra lỗi trong sheet'
  if (path.startsWith('/check-units')) return 'kiểm tra đơn vị'
  if (path.startsWith('/check-model-brand')) return 'kiểm tra model và thương hiệu'
  if (path.startsWith('/sum-packages')) return 'tính tổng số kiện'
  if (path.startsWith('/source-columns')) return 'cập nhật cấu hình cột nguồn'
  if (path.startsWith('/unit-configs')) return 'cập nhật quy tắc đơn vị'
  if (path.startsWith('/document-comparison')) return 'đối chiếu chứng từ'
  return 'xử lý yêu cầu'
}

const responseError = (response: Response, path: string) => {
  const action = actionByPath(path)
  if (response.status === 400) {
    if (path === '/check-sheet-errors') return new Error('Không tìm thấy tab này. Vui lòng kiểm tra lại tên sheet.')
    return new Error(`Thông tin chưa hợp lệ nên không thể ${action}. Vui lòng kiểm tra lại dữ liệu đã nhập.`)
  }
  if (response.status === 401) {
    return new Error(path === '/auth/login'
      ? 'Tên đăng nhập hoặc mật khẩu không đúng.'
      : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  }
  if (response.status === 403) return new Error(`Bạn chưa có quyền ${action}. Vui lòng kiểm tra quyền truy cập Google Sheet.`)
  if (response.status === 404) return new Error(`Chức năng ${action} hiện chưa khả dụng. Vui lòng liên hệ quản trị viên.`)
  if (response.status === 409) return new Error(`Dữ liệu đã thay đổi nên chưa thể ${action}. Vui lòng tải lại và thử lại.`)
  if (response.status === 429) return new Error('Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.')
  if (response.status === 413) return new Error('File PDF vượt quá giới hạn 15 MB.')
  if (response.status === 502) return new Error('Không thể đọc Google Sheet. Hãy kiểm tra link, tên tab và quyền Viewer.')
  if (response.status === 503) return new Error('Google Sheets đang tạm thời không khả dụng. Vui lòng thử lại sau.')
  if (response.status >= 500) return new Error(`Máy chủ đang gặp sự cố khi ${action}. Vui lòng thử lại sau.`)
  return new Error(`Không thể ${action}. Vui lòng thử lại.`)
}

const fetchApi = async (path: string, options?: RequestInit) => {
  try {
    return await fetch(`${API_BASE_URL}${path}`, options)
  } catch {
    throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.')
  }
}

let refreshPromise: Promise<AuthSession> | null = null

const refreshSession = async (): Promise<AuthSession> => {
  if (refreshPromise) return refreshPromise
  const refreshToken = readSession()?.refreshToken
  if (!refreshToken) {
    clearSession()
    throw new Error('Phiên đăng nhập đã hết hạn')
  }

  refreshPromise = fetchApi('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).then(async (response) => {
    if (!response.ok) {
      clearSession()
      throw new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại')
    }
    const session = await response.json() as AuthSession
    saveSession(session)
    return session
  }).finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

const request = async <T>(
  path: string,
  options?: RequestInit,
  notFoundAsNull = false,
  retryAfterRefresh = true,
): Promise<T> => {
  const accessToken = readSession()?.accessToken
  const response = await fetchApi(path, {
    ...options,
    headers: {
      ...(!(options?.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  })
  if (response.status === 401 && retryAfterRefresh) {
    await refreshSession()
    return request<T>(path, options, notFoundAsNull, false)
  }
  if (response.status === 404 && notFoundAsNull) return null as T
  if (!response.ok) throw responseError(response, path)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  hasSession: () => Boolean(readSession()?.accessToken && readSession()?.refreshToken),
  currentUser: () => readSession()?.user ?? null,
  login: async (username: string, password: string) => {
    const response = await fetchApi('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) throw responseError(response, '/auth/login')
    const session = await response.json() as AuthSession
    saveSession(session)
    return session
  },
  logout: clearSession,
  sourceColumns: () => request<SourceColumnConfig>('/source-columns'),
  updateSourceColumns: (sourceColumns: Record<string, string>) =>
    request<SourceColumnConfig>('/source-columns', {
      method: 'PATCH', body: JSON.stringify({ sourceColumns }),
    }),
  resetSourceColumns: () =>
    request<SourceColumnConfig>('/source-columns/reset', { method: 'POST' }),
  copySourceSheet: (body: CopySourceSheetInput) =>
    request<CopySourceSheetResult>('/copy-source-sheet', {
      method: 'POST', body: JSON.stringify(body),
    }),
  checkSourceSheetColumns: (body: Omit<CopySourceSheetInput, 'targetSheetName'>) =>
    request<CheckSourceSheetColumnsResult>('/copy-source-sheet/check-columns', {
      method: 'POST', body: JSON.stringify(body),
    }),
  googleSheetConfig: () => request<GoogleSheetConfig | null>('/google-sheet-config', undefined, true),
  sourceGoogleSheetNames: (sourceGoogleSheetId: string) =>
    request<GoogleSheetNames>(`/copy-source-sheet/sheet-names?sourceGoogleSheetId=${encodeURIComponent(sourceGoogleSheetId)}`),
  createGoogleSheetConfig: (googleSheetId: string) =>
    request<GoogleSheetConfig>('/google-sheet-config', {
      method: 'POST', body: JSON.stringify({ googleSheetId }),
    }),
  updateGoogleSheetConfig: (googleSheetId: string) =>
    request<GoogleSheetConfig>('/google-sheet-config', {
      method: 'PATCH', body: JSON.stringify({ googleSheetId }),
    }),
  deleteGoogleSheetConfig: () =>
    request<void>('/google-sheet-config', { method: 'DELETE' }),
  defaults: () => request<ColumnDefaults>('/unit-configs/column-defaults'),
  checkUnits: (body: Record<string, string>) =>
    request<{ success: boolean; checkedRows: number; invalidRows: import('./types').UnitInvalidRow[] }>('/check-units', {
      method: 'POST', body: JSON.stringify(body),
    }),
  checkSheetErrors: (body: Record<string, string>) =>
    request<CheckSheetErrorsResult>('/check-sheet-errors', {
      method: 'POST', body: JSON.stringify(body),
    }),
  checkModelBrand: (body: Record<string, string>) =>
    request<{ success: boolean; checkedRows: number; message: string; invalidRows: import('./types').ModelInvalidRow[] }>('/check-model-brand', {
      method: 'POST', body: JSON.stringify(body),
    }),
  sumPackages: (body: Record<string, string>) =>
    request<{ success: boolean; totalGroups: number; totalPackages: number; groups: import('./types').PackageGroup[] }>('/sum-packages', {
      method: 'POST', body: JSON.stringify(body),
    }),
  compareDocument: (input: { pdf: File; spreadsheetUrl: string; sheetName?: string }) => {
    const formData = new FormData()
    formData.append('pdf', input.pdf)
    formData.append('spreadsheetUrl', input.spreadsheetUrl.trim())
    if (input.sheetName?.trim()) formData.append('sheetName', input.sheetName.trim())
    return request<DocumentComparisonResult>('/document-comparison/compare', { method: 'POST', body: formData })
  },
  rules: () => request<UnitRule[]>('/unit-configs'),
  createRule: (body: Omit<UnitRule, 'id'>) => request<UnitRule>('/unit-configs', { method: 'POST', body: JSON.stringify(body) }),
  updateRule: (id: UnitRule['id'], body: Partial<UnitRule>) => request<UnitRule>(`/unit-configs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRule: (id: UnitRule['id']) => request<void>(`/unit-configs/${id}`, { method: 'DELETE' }),
}
