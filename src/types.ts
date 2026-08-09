export type ColumnDefaults = {
  checkUnits: Record<string, string>
  checkModelBrand: Record<string, string>
  sumPackages: Record<string, string>
}

export type UnitInvalidRow = {
  rowNumber: number
  description: string
  actualUnit: string
  expectedUnit: string
  matchedPackageUnit: string
}

export type ModelMismatch = {
  field: string
  expected: string
  actual: string
}

export type ModelInvalidRow = {
  rowNumber: number
  sourceValue: string
  referenceValue: string
  mismatches: ModelMismatch[]
}

export type PackageGroup = {
  link: string
  totalPackages: number
  rowNumbers: number[]
}

export type SheetCellError = {
  cell: string
  type: string
  message: string
}

export type CheckSheetErrorsResult = {
  sheetName: string
  hasErrors: boolean
  errorCount: number
  errors: SheetCellError[]
}

export type UnitRule = {
  id: string | number
  packageUnit: string
  expectedUnit: string
}

export type GoogleSheetConfig = {
  googleSheetId: string
  createdAt: string
  updatedAt: string
}

export type CopySourceSheetInput = {
  sourceGoogleSheetId: string
  sourceSheetName: string
  targetSheetName?: string
  sourceColumns?: Record<string, string>
}

export type CopySourceSheetResult = {
  success: true
  copiedRows: number
  copiedMergedRanges: number
}

export type AuthSession = {
  success: true
  user: {
    username: string
  }
  accessToken: string
  refreshToken: string
}

export type SourceColumnConfig = {
  defaultSourceColumns: Record<string, string>
  sourceColumns: Record<string, string>
}

export type ComparisonStatus = 'matched' | 'mismatched' | 'missing_in_pdf' | 'missing_in_excel'
export type FieldComparison = { match: boolean; pdf: string | null; excel: string | null }
export type RowComparison = {
  rowNumber: number
  status: ComparisonStatus
  fields: { nameOfGood: FieldComparison; hsCode: FieldComparison; quantity: FieldComparison }
  pdfQuantityUnit: string | null
}
export type DocumentComparisonResult = {
  spreadsheetId: string
  sheetName: string
  summary: { pdfRows: number; excelRows: number; comparedRows: number; matchedRows: number; mismatchedRows: number; missingInPdf: number; missingInExcel: number; allMatched: boolean }
  rows: RowComparison[]
}
