import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit'

type CopySourceState = {
  sourceGoogleSheetValue: string
  sheetsBySource: Record<string, Array<{ sheetName: string; copied: boolean }>>
}

const STORAGE_KEY = 'excelflow.copy-source'

const loadState = (): CopySourceState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return { sourceGoogleSheetValue: '', sheetsBySource: {} }
    const parsed = JSON.parse(saved) as Partial<CopySourceState>
    return {
      sourceGoogleSheetValue: typeof parsed.sourceGoogleSheetValue === 'string' ? parsed.sourceGoogleSheetValue : '',
      sheetsBySource: parsed.sheetsBySource && typeof parsed.sheetsBySource === 'object'
        ? parsed.sheetsBySource : {},
    }
  } catch {
    return { sourceGoogleSheetValue: '', sheetsBySource: {} }
  }
}

const copySourceSlice = createSlice({
  name: 'copySource',
  initialState: loadState(),
  reducers: {
    setSourceGoogleSheetValue: (state, action: PayloadAction<string>) => {
      state.sourceGoogleSheetValue = action.payload
    },
    setSourceSheets: (state, action: PayloadAction<{ sourceGoogleSheetId: string; sheetNames: string[] }>) => {
      const { sourceGoogleSheetId, sheetNames } = action.payload
      const current = state.sheetsBySource[sourceGoogleSheetId] ?? []
      const copiedNames = new Set(current.filter((sheet) => sheet.copied).map((sheet) => sheet.sheetName))
      state.sheetsBySource[sourceGoogleSheetId] = sheetNames.map((sheetName) => ({
        sheetName,
        copied: copiedNames.has(sheetName),
      }))
    },
    markSheetCopied: (state, action: PayloadAction<{ sourceGoogleSheetId: string; sheetName: string }>) => {
      const { sourceGoogleSheetId, sheetName } = action.payload
      const sheets = state.sheetsBySource[sourceGoogleSheetId] ?? []
      const sheet = sheets.find((item) => item.sheetName === sheetName)
      if (sheet) sheet.copied = true
      else state.sheetsBySource[sourceGoogleSheetId] = [...sheets, { sheetName, copied: true }]
    },
  },
})

export const { markSheetCopied, setSourceGoogleSheetValue, setSourceSheets } = copySourceSlice.actions

export const store = configureStore({ reducer: { copySource: copySourceSlice.reducer } })

store.subscribe(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store.getState().copySource))
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
