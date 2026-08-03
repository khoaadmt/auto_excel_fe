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
