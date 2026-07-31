import type {
  AuthSession, ColumnDefaults, CopySourceSheetInput, CopySourceSheetResult, GoogleSheetConfig,
  SourceColumnConfig, UnitRule,
} from './types'

const BACKEND_URL = import.meta.env.BACKEND_URL || 'http://localhost:5000'
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

const responseError = async (response: Response) => {
  try {
    const body = await response.json() as { message?: string | string[] }
    const detail = Array.isArray(body.message) ? body.message.join(', ') : body.message
    return new Error(detail || `Yêu cầu thất bại (${response.status})`)
  } catch {
    return new Error(`Yêu cầu thất bại (${response.status})`)
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

  refreshPromise = fetch(`${BACKEND_URL}/api/auth/refresh`, {
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
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options?.headers,
    },
  })
  if (response.status === 401 && retryAfterRefresh) {
    await refreshSession()
    return request<T>(path, options, notFoundAsNull, false)
  }
  if (response.status === 404 && notFoundAsNull) return null as T
  if (!response.ok) throw await responseError(response)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  hasSession: () => Boolean(readSession()?.accessToken && readSession()?.refreshToken),
  currentUser: () => readSession()?.user ?? null,
  login: async (username: string, password: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!response.ok) throw await responseError(response)
    const session = await response.json() as AuthSession
    saveSession(session)
    return session
  },
  logout: clearSession,
  sourceColumns: () => request<SourceColumnConfig>('/api/source-columns'),
  updateSourceColumns: (sourceColumns: Record<string, string>) =>
    request<SourceColumnConfig>('/api/source-columns', {
      method: 'PATCH', body: JSON.stringify({ sourceColumns }),
    }),
  resetSourceColumns: () =>
    request<SourceColumnConfig>('/api/source-columns/reset', { method: 'POST' }),
  copySourceSheet: (body: CopySourceSheetInput) =>
    request<CopySourceSheetResult>('/api/copy-source-sheet', {
      method: 'POST', body: JSON.stringify(body),
    }),
  googleSheetConfig: () => request<GoogleSheetConfig | null>('/api/google-sheet-config', undefined, true),
  createGoogleSheetConfig: (googleSheetId: string) =>
    request<GoogleSheetConfig>('/api/google-sheet-config', {
      method: 'POST', body: JSON.stringify({ googleSheetId }),
    }),
  updateGoogleSheetConfig: (googleSheetId: string) =>
    request<GoogleSheetConfig>('/api/google-sheet-config', {
      method: 'PATCH', body: JSON.stringify({ googleSheetId }),
    }),
  deleteGoogleSheetConfig: () =>
    request<void>('/api/google-sheet-config', { method: 'DELETE' }),
  defaults: () => request<ColumnDefaults>('/api/unit-configs/column-defaults'),
  checkUnits: (body: Record<string, string>) =>
    request<{ success: boolean; checkedRows: number; invalidRows: import('./types').UnitInvalidRow[] }>('/api/check-units', {
      method: 'POST', body: JSON.stringify(body),
    }),
  checkModelBrand: (body: Record<string, string>) =>
    request<{ success: boolean; checkedRows: number; message: string; invalidRows: import('./types').ModelInvalidRow[] }>('/api/check-model-brand', {
      method: 'POST', body: JSON.stringify(body),
    }),
  sumPackages: (body: Record<string, string>) =>
    request<{ success: boolean; totalGroups: number; totalPackages: number; groups: import('./types').PackageGroup[] }>('/api/sum-packages', {
      method: 'POST', body: JSON.stringify(body),
    }),
  rules: () => request<UnitRule[]>('/api/unit-configs'),
  createRule: (body: Omit<UnitRule, 'id'>) => request<UnitRule>('/api/unit-configs', { method: 'POST', body: JSON.stringify(body) }),
  updateRule: (id: UnitRule['id'], body: Partial<UnitRule>) => request<UnitRule>(`/api/unit-configs/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteRule: (id: UnitRule['id']) => request<void>(`/api/unit-configs/${id}`, { method: 'DELETE' }),
}
