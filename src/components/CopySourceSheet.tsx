import { useState } from 'react'
import {
  CheckCircleOutlined, CopyOutlined, DeleteOutlined, InfoCircleOutlined,
  LinkOutlined, PlusOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Descriptions, Empty, Form, Input, Modal, Segmented, Skeleton, Tag, Typography, message } from 'antd'
import { api } from '../api'
import { useAppDispatch, useAppSelector } from '../store-hooks'
import { markSheetCopied, setSourceGoogleSheetValue, setSourceSheets } from '../store'
import type { CheckSourceSheetColumnsResult, CopySourceSheetInput } from '../types'

type FormValues = Omit<CopySourceSheetInput, 'sourceColumns'> & {
  columnOverrides?: { identifier?: string; column?: string }[]
}

const extractSheetId = (value: string) => {
  const trimmed = value.trim()
  return trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? trimmed
}

const SERVICE_ACCOUNT_EMAIL = 'sheet-translator@flash-clover-378404.iam.gserviceaccount.com'
const EMPTY_SOURCE_SHEETS: Array<{ sheetName: string; copied: boolean }> = []

export function CopySourceSheet() {
  const [form] = Form.useForm<FormValues>()
  const dispatch = useAppDispatch()
  const savedSourceValue = useAppSelector((state) => state.copySource.sourceGoogleSheetValue)
  const sourceGoogleSheetId = extractSheetId(savedSourceValue)
  const sourceSheets = useAppSelector((state) => state.copySource.sheetsBySource[sourceGoogleSheetId] ?? EMPTY_SOURCE_SHEETS)
  const sheetNames = sourceSheets.map((sheet) => sheet.sheetName)
  const [loadingSheets, setLoadingSheets] = useState(false)
  const [sheetNamesError, setSheetNamesError] = useState(false)
  const [hasSource, setHasSource] = useState(sourceSheets.length > 0)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [checkErrors, setCheckErrors] = useState<Record<string, CheckSourceSheetColumnsResult>>({})
  const [detailSheetName, setDetailSheetName] = useState<string | null>(null)
  const [sheetSearch, setSheetSearch] = useState('')
  const [sheetFilter, setSheetFilter] = useState<'all' | 'pending' | 'copied'>('all')
  const normalizedSearch = sheetSearch.trim().toLocaleLowerCase()
  const visibleSheets = sourceSheets.filter((sheet) => {
    const matchesSearch = !normalizedSearch || sheet.sheetName.toLocaleLowerCase().includes(normalizedSearch)
    const matchesStatus = sheetFilter === 'all' || (sheetFilter === 'copied' ? sheet.copied : !sheet.copied)
    return matchesSearch && matchesStatus
  })

  const loadSheetNames = async (value?: string) => {
    const sourceGoogleSheetId = extractSheetId(value ?? form.getFieldValue('sourceGoogleSheetId') ?? '')
    if (!/^[a-zA-Z0-9-_]+$/.test(sourceGoogleSheetId)) {
      setHasSource(false)
      return
    }
    setLoadingSheets(true)
    setSheetNamesError(false)
    setHasSource(true)
    try {
      const data = await api.sourceGoogleSheetNames(sourceGoogleSheetId)
      dispatch(setSourceSheets({ sourceGoogleSheetId, sheetNames: data.sheetNames }))
      setCheckErrors({})
    } catch (err) {
      setSheetNamesError(true)
      message.error(err instanceof Error ? err.message : 'Không thể tải danh sách sheet')
    } finally {
      setLoadingSheets(false)
    }
  }

  const activateSource = async () => {
    try {
      const { sourceGoogleSheetId } = await form.validateFields(['sourceGoogleSheetId'])
      await loadSheetNames(sourceGoogleSheetId)
    } catch {
      setHasSource(false)
    }
  }

  const getActionInput = async (sourceSheetName: string) => {
    const values = await form.validateFields()
    const sourceColumns = Object.fromEntries(
      (values.columnOverrides ?? [])
        .filter(({ identifier, column }) => identifier?.trim() && column?.trim())
        .map(({ identifier, column }) => [identifier!.trim(), column!.trim().toUpperCase()]),
    )
    return {
      sourceGoogleSheetId: extractSheetId(values.sourceGoogleSheetId),
      sourceSheetName,
      ...(Object.keys(sourceColumns).length ? { sourceColumns } : {}),
    }
  }

  const copySheet = async (sourceSheetName: string) => {
    setActiveAction(`copy:${sourceSheetName}`)
    try {
      const input = await getActionInput(sourceSheetName)
      const targetSheetName = form.getFieldValue('targetSheetName')?.trim()
      const data = await api.copySourceSheet({ ...input, ...(targetSheetName ? { targetSheetName } : {}) })
      dispatch(markSheetCopied({ sourceGoogleSheetId: input.sourceGoogleSheetId, sheetName: sourceSheetName }))
      message.success(`Đã sao chép ${data.copiedRows} dòng từ sheet “${sourceSheetName}”`)
    } catch (err) {
      if (err instanceof Error) message.error(err.message)
    } finally {
      setActiveAction(null)
    }
  }

  const checkSheet = async (sourceSheetName: string) => {
    setActiveAction(`check:${sourceSheetName}`)
    try {
      const data = await api.checkSourceSheetColumns(await getActionInput(sourceSheetName))
      if (data.success) {
        setCheckErrors((current) => {
          const next = { ...current }
          delete next[sourceSheetName]
          return next
        })
        message.success(`Sheet “${sourceSheetName}”: ${data.message}`)
      } else {
        setCheckErrors((current) => ({ ...current, [sourceSheetName]: data }))
        message.warning(`Sheet “${sourceSheetName}”: ${data.message}`)
      }
    } catch (err) {
      if (err instanceof Error) message.error(err.message)
    } finally {
      setActiveAction(null)
    }
  }

  const copyServiceEmail = async () => {
    try {
      await navigator.clipboard.writeText(SERVICE_ACCOUNT_EMAIL)
      message.success('Đã sao chép email service account')
    } catch {
      message.error('Không thể sao chép email')
    }
  }

  return (
    <main id="main-content" className="page-shell" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <Typography.Text className="eyebrow">DATA IMPORT</Typography.Text>
          <Typography.Title level={1}>COPY SOURCE SHEET</Typography.Title>
          <Typography.Paragraph>
            Nối dữ liệu từ Google Sheet nguồn vào cuối sheet đang làm việc, giữ nguyên định dạng, ghi chú và vùng gộp.
          </Typography.Paragraph>
        </div>
        <Tag icon={<CopyOutlined />} color="processing">Sao chép E:S, W, Y</Tag>
      </div>

      <div className="copy-form-shell">
        <Card className="panel form-panel copy-form-panel">
          <div className="panel-title">
            <div className="step-number">1</div>
            <div><h2>Chọn dữ liệu nguồn</h2><p>Sheet đích là Google Sheet đang kết nối phía trên.</p></div>
          </div>
          <Form form={form} layout="vertical" requiredMark={false}
            initialValues={{ sourceGoogleSheetId: savedSourceValue, targetSheetName: 'data', columnOverrides: [] }}>
            <div className="copy-form-layout">
              <section className="copy-form-section" aria-label="Thông tin và danh sách sheet nguồn">
                <div className="source-config-fields">
                  <Form.Item className="source-url-item" label="GOOGLE SHEET NGUỒN (ID HOẶC URL)">
                    <div className="source-url-control">
                      <Form.Item name="sourceGoogleSheetId" noStyle
                        rules={[
                          { required: true, whitespace: true, message: 'Vui lòng nhập Google Sheet nguồn' },
                          { validator: (_, value) => /^[a-zA-Z0-9-_]+$/.test(extractSheetId(value ?? ''))
                            ? Promise.resolve() : Promise.reject(new Error('URL hoặc Google Sheet ID không hợp lệ')) },
                        ]}>
                        <Input size="large" prefix={<LinkOutlined />} placeholder="Google Sheet URL hoặc ID"
                          onChange={(event) => {
                            dispatch(setSourceGoogleSheetValue(event.currentTarget.value))
                            setHasSource(false); setSheetNamesError(false); setCheckErrors({}); setDetailSheetName(null)
                            setSheetSearch(''); setSheetFilter('all')
                          }} />
                      </Form.Item>
                      <Button size="large" type="primary" loading={loadingSheets} onClick={() => { void activateSource() }}>
                        Active
                      </Button>
                    </div>
                  </Form.Item>
                  <Form.Item className="target-sheet-item" name="targetSheetName" label="TÊN SHEET ĐÍCH" extra="Mặc định: data">
                    <Input size="large" placeholder="data" />
                  </Form.Item>
                </div>
                <div className="source-sheet-list" aria-live="polite">
                  <div className="source-sheet-list-heading">
                    <div><strong>DANH SÁCH SHEET</strong><span>{sheetNames.length} sheet</span></div>
                    <Button type="text" size="small" icon={<ReloadOutlined />} loading={loadingSheets}
                      aria-label="Tải lại danh sách sheet" disabled={!hasSource} onClick={() => { void loadSheetNames() }} />
                  </div>
                  {loadingSheets ? <Skeleton active paragraph={{ rows: 3 }} title={false} />
                    : sheetNamesError ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không thể tải danh sách sheet">
                        <Button size="small" onClick={() => { void loadSheetNames() }}>Thử lại</Button>
                      </Empty>
                    ) : !hasSource ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nhập Google Sheet nguồn để tải danh sách" />
                      : sheetNames.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Source không có sheet nào" />
                      : <>
                        <div className="source-sheet-toolbar">
                          <Input size="small" allowClear value={sheetSearch} placeholder="Tìm theo tên sheet..."
                            onChange={(event) => setSheetSearch(event.currentTarget.value)} />
                          <Segmented size="small" value={sheetFilter} onChange={(value) => setSheetFilter(value as typeof sheetFilter)}
                            options={[{ label: 'Tất cả', value: 'all' }, { label: 'Chưa copy', value: 'pending' }, { label: 'Đã copy', value: 'copied' }]} />
                          <span>{visibleSheets.length}/{sheetNames.length} kết quả</span>
                        </div>
                        {visibleSheets.length === 0 ? (
                          <Empty className="source-sheet-filter-empty" image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Không có sheet phù hợp" />
                        ) : <div className="source-sheet-table" role="table" aria-label="Danh sách sheet nguồn">
                        <div className="source-sheet-row source-sheet-header" role="row">
                          <span role="columnheader">Tên sheet</span><span role="columnheader">Action</span>
                        </div>
                        {visibleSheets.map(({ sheetName, copied: isCopied }) => {
                          return (
                          <div className={`source-sheet-row${isCopied ? ' is-copied' : ''}`} role="row" key={sheetName}>
                            <span className="source-sheet-name" role="cell" title={sheetName}>{sheetName}</span>
                            <span className="source-sheet-actions" role="cell">
                              <Button className="source-sheet-copy-btn" size="small" type="primary" icon={<CopyOutlined />}
                                loading={activeAction === `copy:${sheetName}`}
                                disabled={activeAction !== null && activeAction !== `copy:${sheetName}`}
                                onClick={() => copySheet(sheetName)}>Copy</Button>
                              <Button className="source-sheet-check-btn" size="small" icon={<CheckCircleOutlined />}
                                loading={activeAction === `check:${sheetName}`}
                                disabled={activeAction !== null && activeAction !== `check:${sheetName}`}
                                onClick={() => checkSheet(sheetName)}>Check</Button>
                              {checkErrors[sheetName] ? (
                                <Button className="source-sheet-detail-btn" size="small" danger
                                  onClick={() => setDetailSheetName(sheetName)}>Chi tiết</Button>
                              ) : null}
                            </span>
                          </div>
                          )
                        })}
                      </div>}
                      </>}
                </div>
              </section>

              <section className="copy-form-section override-section" aria-labelledby="column-override-heading">
                <div className="copy-section-heading override-heading">
                  <strong id="column-override-heading">Ghi đè vị trí cột</strong>
                  <span>Chỉ thêm các cột có bố cục khác mặc định.</span>
                </div>
                <Form.List name="columnOverrides">
                  {(fields, { add, remove }) => (
                    <div className="override-list">
                      {fields.map(({ key, name }) => (
                        <div className="override-row" key={key}>
                          <Form.Item name={[name, 'identifier']} rules={[{ required: true, whitespace: true, message: 'Nhập mã cột' }]}>
                            <Input placeholder="Mã, ví dụ SPM" />
                          </Form.Item>
                          <Form.Item name={[name, 'column']} rules={[
                            { required: true, message: 'Nhập vị trí' },
                            { pattern: /^[A-Za-z]+$/, message: 'Ví dụ Z hoặc AA' },
                          ]}>
                            <Input className="column-input" maxLength={3} placeholder="Z"
                              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.toUpperCase() }} />
                          </Form.Item>
                          <Button type="text" danger icon={<DeleteOutlined />} aria-label="Xóa ghi đè cột" onClick={() => remove(name)} />
                        </div>
                      ))}
                      <Button type="dashed" block icon={<PlusOutlined />} onClick={() => add()}>Thêm cột ghi đè</Button>
                    </div>
                  )}
                </Form.List>
              </section>
            </div>

            <div className="copy-form-footer">
              <Alert className="info-alert copy-info" type="info" showIcon icon={<InfoCircleOutlined />}
                message={(
                  <div className="service-account-info">
                    <span>Cấp quyền Viewer ở file nguồn và Editor ở file đích cho service account:</span>
                    <code>{SERVICE_ACCOUNT_EMAIL}</code>
                  </div>
                )}
                action={<Button size="small" icon={<CopyOutlined />} onClick={copyServiceEmail}>Sao chép email</Button>} />
            </div>
          </Form>
        </Card>
      </div>

      <Modal title={`Chi tiết lỗi · ${detailSheetName ?? ''}`} open={Boolean(detailSheetName)}
        footer={<Button type="primary" onClick={() => setDetailSheetName(null)}>Đóng</Button>}
        onCancel={() => setDetailSheetName(null)}>
        {detailSheetName && checkErrors[detailSheetName] ? (
          <div className="source-check-detail">
            <Alert type="error" showIcon message={checkErrors[detailSheetName].message} />
            {checkErrors[detailSheetName].mismatch ? (
              <Descriptions bordered size="small" column={1}>
                <Descriptions.Item label="Ô lỗi">{checkErrors[detailSheetName].mismatch.cell}</Descriptions.Item>
                <Descriptions.Item label="Cột">{checkErrors[detailSheetName].mismatch.column}</Descriptions.Item>
                <Descriptions.Item label="Tiêu đề mong đợi">
                  {checkErrors[detailSheetName].mismatch.expectedTitle}
                </Descriptions.Item>
                <Descriptions.Item label="Giá trị thực tế">
                  {checkErrors[detailSheetName].mismatch.actualTitle || '(Trống)'}
                </Descriptions.Item>
              </Descriptions>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </main>
  )
}
