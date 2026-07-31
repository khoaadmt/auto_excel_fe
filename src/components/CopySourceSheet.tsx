import { useState } from 'react'
import {
  ArrowRightOutlined, CopyOutlined, DeleteOutlined, InfoCircleOutlined,
  LinkOutlined, PlusOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Tag, Typography, message } from 'antd'
import { api } from '../api'
import type { CopySourceSheetInput } from '../types'

type FormValues = Omit<CopySourceSheetInput, 'sourceColumns'> & {
  columnOverrides?: { identifier?: string; column?: string }[]
}

const extractSheetId = (value: string) => {
  const trimmed = value.trim()
  return trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? trimmed
}

const SERVICE_ACCOUNT_EMAIL = 'sheet-translator@flash-clover-378404.iam.gserviceaccount.com'

export function CopySourceSheet() {
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)

  const submit = async (values: FormValues) => {
    setLoading(true)
    try {
      const sourceColumns = Object.fromEntries(
        (values.columnOverrides ?? [])
          .filter(({ identifier, column }) => identifier?.trim() && column?.trim())
          .map(({ identifier, column }) => [identifier!.trim(), column!.trim().toUpperCase()]),
      )
      const data = await api.copySourceSheet({
        sourceGoogleSheetId: extractSheetId(values.sourceGoogleSheetId),
        sourceSheetName: values.sourceSheetName.trim(),
        ...(values.targetSheetName?.trim() ? { targetSheetName: values.targetSheetName.trim() } : {}),
        ...(Object.keys(sourceColumns).length ? { sourceColumns } : {}),
      })
      message.success(`Đã sao chép ${data.copiedRows} dòng dữ liệu`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể kết nối máy chủ'
      message.error(errorMessage)
    } finally {
      setLoading(false)
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
          <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}
            initialValues={{ sourceSheetName: 'data', targetSheetName: 'data', columnOverrides: [] }}>
            <div className="copy-form-layout">
              <section className="copy-form-section" aria-labelledby="source-details-heading">
                <div className="copy-section-heading">
                  <strong id="source-details-heading">Thông tin bảng tính</strong>
                  <span>Xác định file và sheet cần lấy dữ liệu.</span>
                </div>
                <Form.Item name="sourceGoogleSheetId" label="GOOGLE SHEET NGUỒN (ID HOẶC URL)"
                  rules={[
                    { required: true, whitespace: true, message: 'Vui lòng nhập Google Sheet nguồn' },
                    { validator: (_, value) => /^[a-zA-Z0-9-_]+$/.test(extractSheetId(value ?? ''))
                      ? Promise.resolve() : Promise.reject(new Error('URL hoặc Google Sheet ID không hợp lệ')) },
                  ]}>
                  <Input size="large" prefix={<LinkOutlined />} placeholder="https://docs.google.com/spreadsheets/d/..." />
                </Form.Item>
                <div className="field-grid">
                  <Form.Item name="sourceSheetName" label="TÊN SHEET NGUỒN"
                    rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên sheet nguồn' }]}>
                    <Input size="large" placeholder="data" />
                  </Form.Item>
                  <Form.Item name="targetSheetName" label="TÊN SHEET ĐÍCH" extra="Mặc định: data">
                    <Input size="large" placeholder="data" />
                  </Form.Item>
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
              <Button size="large" type="primary" htmlType="submit" loading={loading} icon={<ArrowRightOutlined />}>
                {loading ? 'Đang sao chép...' : 'Bắt đầu sao chép'}
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </main>
  )
}
