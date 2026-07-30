import { useEffect, useState } from 'react'
import {
  CheckCircleFilled, DeleteOutlined, EditOutlined, ExportOutlined,
  FileExcelOutlined, LinkOutlined, ReloadOutlined,
} from '@ant-design/icons'
import { Button, Form, Input, Modal, Popconfirm, Skeleton, Tag, Tooltip, message } from 'antd'
import { api } from '../api'
import type { GoogleSheetConfig } from '../types'

const extractSheetId = (value: string) => {
  const trimmed = value.trim()
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return urlMatch?.[1] ?? trimmed
}

export function GoogleSheetContext() {
  const [config, setConfig] = useState<GoogleSheetConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [form] = Form.useForm<{ googleSheetId: string }>()

  const load = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      setConfig(await api.googleSheetConfig())
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    api.googleSheetConfig()
      .then((next) => { if (active) setConfig(next) })
      .catch(() => { if (active) setLoadError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const showEditor = () => {
    form.setFieldValue('googleSheetId', config?.googleSheetId ?? '')
    setOpen(true)
  }

  const save = async ({ googleSheetId }: { googleSheetId: string }) => {
    setSaving(true)
    try {
      const id = extractSheetId(googleSheetId)
      const next = config
        ? await api.updateGoogleSheetConfig(id)
        : await api.createGoogleSheetConfig(id)
      setConfig(next)
      setOpen(false)
      message.success(config ? 'Đã thay đổi Google Sheet' : 'Đã kết nối Google Sheet')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể lưu Google Sheet')
    } finally {
      setSaving(false)
    }
  }

  const disconnect = async () => {
    try {
      await api.deleteGoogleSheetConfig()
      setConfig(null)
      message.success('Đã ngắt kết nối Google Sheet')
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể ngắt kết nối')
    }
  }

  return (
    <>
      <section className={`sheet-context ${!config && !loading ? 'is-disconnected' : ''}`} aria-label="Google Sheet đang sử dụng">
        <div className="sheet-context-main">
          <div className="sheet-context-icon"><FileExcelOutlined /></div>
          {loading ? (
            <Skeleton active paragraph={false} title={{ width: 220 }} />
          ) : loadError ? (
            <div className="sheet-context-copy">
              <span>CURRENT GOOGLE SHEET</span>
              <strong>Không thể tải cấu hình</strong>
            </div>
          ) : config ? (
            <div className="sheet-context-copy">
              <span>CURRENT GOOGLE SHEET <Tag icon={<CheckCircleFilled />} color="success">CONNECTED</Tag></span>
              <Tooltip title={config.googleSheetId}>
                <strong>{config.googleSheetId}</strong>
              </Tooltip>
            </div>
          ) : (
            <div className="sheet-context-copy">
              <span>CURRENT GOOGLE SHEET</span>
              <strong>Chưa kết nối Google Sheet</strong>
              <small>Cần cấu hình trước khi chạy các tác vụ dữ liệu.</small>
            </div>
          )}
        </div>

        <div className="sheet-context-actions">
          {loadError ? (
            <Button icon={<ReloadOutlined />} onClick={load}>Thử lại</Button>
          ) : config ? (
            <>
              <Button href={`https://docs.google.com/spreadsheets/d/${config.googleSheetId}/edit`}
                target="_blank" icon={<ExportOutlined />}>Mở Sheet</Button>
              <Button icon={<EditOutlined />} onClick={showEditor}>Thay đổi</Button>
              <Popconfirm title="Ngắt kết nối Google Sheet?" description="Các tác vụ sẽ không thể chạy cho đến khi kết nối lại."
                okText="Ngắt kết nối" cancelText="Hủy" onConfirm={disconnect}>
                <Button danger aria-label="Ngắt kết nối Google Sheet" icon={<DeleteOutlined />} />
              </Popconfirm>
            </>
          ) : !loading ? (
            <Button type="primary" icon={<LinkOutlined />} onClick={showEditor}>Kết nối Google Sheet</Button>
          ) : null}
        </div>
      </section>

      <Modal title={config ? 'Thay đổi Google Sheet' : 'Kết nối Google Sheet'} open={open}
        okText={config ? 'Lưu thay đổi' : 'Kết nối'} cancelText="Hủy" confirmLoading={saving}
        onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Form.Item name="googleSheetId" label="GOOGLE SHEET ID OR URL"
            extra="Dán URL đầy đủ hoặc ID của Google Spreadsheet."
            rules={[
              { required: true, whitespace: true, message: 'Vui lòng nhập URL hoặc Google Sheet ID' },
              {
                validator: (_, value) => {
                  const id = extractSheetId(value ?? '')
                  return /^[a-zA-Z0-9-_]+$/.test(id)
                    ? Promise.resolve()
                    : Promise.reject(new Error('URL hoặc Google Sheet ID không hợp lệ'))
                },
              },
            ]}>
            <Input size="large" prefix={<LinkOutlined />} placeholder="https://docs.google.com/spreadsheets/d/..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
