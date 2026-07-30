import type { ColumnDefaults, UnitRule } from './types'

const BACKEND_URL = import.meta.env.BACKEND_URL || 'http://localhost:5000'

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  if (!response.ok) throw new Error(`Yêu cầu thất bại (${response.status})`)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
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
