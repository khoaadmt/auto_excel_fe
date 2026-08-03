import { useState, type ReactNode } from 'react'
import { ArrowRightOutlined, CheckCircleFilled, InfoCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Space, Tag, Typography, message } from 'antd'

type Field = { name: string; label: string; defaultValue: string }
type Props<T> = {
  eyebrow: string
  title: string
  description: string
  fields: Field[]
  run: (values: Record<string, string>) => Promise<T>
  result: (data: T) => ReactNode
  setupDescription?: string
  infoMessage?: string | null
  resultDescription?: string
}

export function ToolPage<T>({ eyebrow, title, description, fields, run, result,
  setupDescription = 'Chọn sheet và kiểm tra lại vị trí các cột.',
  infoMessage = 'Có thể để trống vị trí cột để sử dụng cấu hình mặc định đã lưu.',
  resultDescription = 'Chi tiết các dòng cần bạn xem lại.',
}: Props<T>) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<T | null>(null)

  const submit = async (values: Record<string, string>) => {
    setLoading(true)
    try {
      setData(await run(values))
      message.success('Đã xử lý dữ liệu thành công')
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể xử lý dữ liệu. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="main-content" className="page-shell" tabIndex={-1}>
      <div className="page-heading">
        <div>
          <Typography.Text className="eyebrow">{eyebrow}</Typography.Text>
          <Typography.Title level={1}>{title}</Typography.Title>
          <Typography.Paragraph>{description}</Typography.Paragraph>
        </div>
        <Tag icon={<CheckCircleFilled />} color="success">Sẵn sàng</Tag>
      </div>

      <div className="tool-grid">
        <Card className="panel form-panel">
          <div className="panel-title">
            <div className="step-number">1</div>
            <div><h2>Thiết lập dữ liệu</h2><p>{setupDescription}</p></div>
          </div>
          <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
            <Form.Item name="sheetName" label="Tên sheet" initialValue="data" rules={[{ required: true, message: 'Vui lòng nhập tên sheet' }]}>
              <Input size="large" placeholder="Ví dụ: data" />
            </Form.Item>
            <div className="field-grid">
              {fields.map((field) => (
                <Form.Item key={field.name} name={field.name} label={field.label} initialValue={field.defaultValue}
                  rules={[{ pattern: /^[A-Za-z]+$/, message: 'Chỉ nhập chữ cái cột, ví dụ F hoặc AA' }]}>
                  <Input size="large" className="column-input" maxLength={3} onInput={(e) => {
                    e.currentTarget.value = e.currentTarget.value.toUpperCase()
                  }} />
                </Form.Item>
              ))}
            </div>
            {infoMessage && <Alert className="info-alert" type="info" showIcon icon={<InfoCircleOutlined />}
              message={infoMessage} />}
            <Button block size="large" type="primary" htmlType="submit" loading={loading} icon={<ArrowRightOutlined />}>
              {loading ? 'Đang kiểm tra...' : 'Bắt đầu kiểm tra'}
            </Button>
          </Form>
        </Card>

        <Card className="panel result-panel">
          <div className="panel-title">
            <div className="step-number secondary">2</div>
            <div><h2>Kết quả xử lý</h2><p>{resultDescription}</p></div>
          </div>
          {data ? result(data) : (
            <div className="empty-result">
              <div className="empty-illustration"><span /><span /><span /></div>
              <h3>Chưa có kết quả</h3>
              <p>Điền thông tin bên trái và bắt đầu kiểm tra. Kết quả sẽ xuất hiện tại đây.</p>
              <Space size={6}><kbd>Enter</kbd><span>để chạy nhanh</span></Space>
            </div>
          )}
        </Card>
      </div>
    </main>
  )
}
