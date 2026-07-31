import { useState } from 'react'
import {
  FileExcelOutlined, LockOutlined, LoginOutlined, SafetyCertificateOutlined, UserOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { api } from '../api'

type Props = {
  onSuccess: () => void
}

export function Login({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async ({ username, password }: { username: string; password: string }) => {
    setLoading(true)
    setError('')
    try {
      await api.login(username.trim(), password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đăng nhập')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-visual" aria-hidden="true">
        <div className="login-grid-pattern" />
        <div className="login-visual-copy">
          <div className="login-brand-mark"><FileExcelOutlined /></div>
          <Typography.Title>ExcelFlow</Typography.Title>
          <Typography.Paragraph>
            Kiểm tra, chuẩn hóa và xử lý dữ liệu Google Sheet trong một quy trình an toàn.
          </Typography.Paragraph>
          <div className="login-feature"><SafetyCertificateOutlined /><span>made by khoaiuoi</span></div>
        </div>
      </div>

      <section className="login-form-side">
        <Card className="login-card">
          <div className="login-heading">
            <span>WELCOME BACK</span>
            <Typography.Title level={1}>Đăng nhập</Typography.Title>
            <Typography.Paragraph>Nhập tài khoản của bạn để tiếp tục vào ExcelFlow.</Typography.Paragraph>
          </div>
          <Form layout="vertical" onFinish={submit} requiredMark={false} size="large">
            <Form.Item name="username" label="TÊN ĐĂNG NHẬP"
              rules={[{ required: true, whitespace: true, message: 'Vui lòng nhập tên đăng nhập' }]}>
              <Input prefix={<UserOutlined />} autoComplete="username" autoFocus placeholder="Tên đăng nhập" />
            </Form.Item>
            <Form.Item name="password" label="MẬT KHẨU"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}>
              <Input.Password prefix={<LockOutlined />} autoComplete="current-password" placeholder="Mật khẩu" />
            </Form.Item>
            {error && <Alert className="login-error" type="error" showIcon message={error} />}
            <Button block type="primary" htmlType="submit" loading={loading} icon={<LoginOutlined />}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </Form>
          <p className="login-security-note"><LockOutlined /> Token được tự động làm mới khi phiên làm việc còn hiệu lực.</p>
        </Card>
      </section>
    </main>
  )
}
