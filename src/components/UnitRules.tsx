import { useEffect, useState } from 'react'
import { DeleteOutlined, EditOutlined, PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Form, Input, Modal, Popconfirm, Table, Tag, Typography, message } from 'antd'
import { api } from '../api'
import type { UnitRule } from '../types'

const seed: UnitRule[] = [
  { id: 1, packageUnit: 'PCS/BAG', expectedUnit: 'BAG' },
  { id: 2, packageUnit: 'PCS/SET', expectedUnit: 'SET' },
]

export function UnitRules() {
  const [rules, setRules] = useState<UnitRule[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UnitRule | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    api.rules().then(setRules).catch(() => setRules(seed)).finally(() => setLoading(false))
  }, [])

  const save = async (values: Omit<UnitRule, 'id'>) => {
    try {
      if (editing) {
        const updated = await api.updateRule(editing.id, values)
        setRules((items) => items.map((r) => r.id === editing.id ? { ...r, ...updated, ...values } : r))
      } else {
        const created = await api.createRule(values)
        setRules((items) => [...items, created])
      }
    } catch {
      if (editing) setRules((items) => items.map((r) => r.id === editing.id ? { ...r, ...values } : r))
      else setRules((items) => [...items, { id: Date.now(), ...values }])
    }
    message.success(editing ? 'Đã cập nhật quy tắc' : 'Đã thêm quy tắc mới')
    setOpen(false)
  }

  const remove = async (rule: UnitRule) => {
    try { await api.deleteRule(rule.id) } catch { /* demo fallback */ }
    setRules((items) => items.filter((r) => r.id !== rule.id))
    message.success('Đã xóa quy tắc')
  }

  const edit = (rule?: UnitRule) => {
    setEditing(rule ?? null)
    form.setFieldsValue(rule ?? { packageUnit: '', expectedUnit: '' })
    setOpen(true)
  }

  return (
    <main id="main-content" className="page-shell" tabIndex={-1}>
      <div className="page-heading rules-heading">
        <div><Typography.Text className="eyebrow">SYSTEM CONFIGURATION</Typography.Text>
          <Typography.Title level={1}>UNIT RULES</Typography.Title>
          <Typography.Paragraph>Quản lý cách hệ thống đối chiếu đơn vị đóng gói với đơn vị kỳ vọng.</Typography.Paragraph></div>
        <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => edit()}>Thêm quy tắc</Button>
      </div>
      <Alert className="rules-alert" type="info" showIcon icon={<SafetyCertificateOutlined />}
        message="Các thay đổi được áp dụng cho lần kiểm tra tiếp theo."
        description="Ví dụ PCS/BAG → BAG nghĩa là khi mô tả có PCS/BAG, cột UNIT phải có giá trị BAG." />
      <Card className="panel rules-panel">
        <div className="rules-panel-title"><div><h2>Danh sách quy tắc</h2><p>{rules.length} quy tắc đang hoạt động</p></div><Tag color="success">Đang áp dụng</Tag></div>
        <Table loading={loading} rowKey="id" dataSource={rules} pagination={false} columns={[
          { title: 'PACKAGE UNIT', dataIndex: 'packageUnit', render: (v) => <Tag className="code-tag">{v}</Tag> },
          { title: 'EXPECTED UNIT', dataIndex: 'expectedUnit', render: (v) => <strong>{v}</strong> },
          { title: 'STATUS', render: () => <span className="active-status"><i />Hoạt động</span>, responsive: ['md'] },
          { title: '', align: 'right', render: (_, rule) => <div className="row-actions">
            <Button aria-label={`Sửa ${rule.packageUnit}`} icon={<EditOutlined />} onClick={() => edit(rule)} />
            <Popconfirm title="Xóa quy tắc này?" description="Thao tác này không thể hoàn tác." okText="Xóa" cancelText="Hủy" onConfirm={() => remove(rule)}>
              <Button danger aria-label={`Xóa ${rule.packageUnit}`} icon={<DeleteOutlined />} />
            </Popconfirm>
          </div> },
        ]} />
      </Card>
      <Modal title={editing ? 'Chỉnh sửa quy tắc' : 'Thêm quy tắc mới'} open={open} onCancel={() => setOpen(false)}
        okText={editing ? 'Lưu thay đổi' : 'Thêm quy tắc'} cancelText="Hủy" onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save} requiredMark={false}>
          <Form.Item name="packageUnit" label="PACKAGE UNIT" rules={[{ required: true, message: 'Vui lòng nhập đơn vị đóng gói' }]}>
            <Input size="large" placeholder="Ví dụ: PCS/BOX" />
          </Form.Item>
          <Form.Item name="expectedUnit" label="EXPECTED UNIT" rules={[{ required: true, message: 'Vui lòng nhập đơn vị kỳ vọng' }]}>
            <Input size="large" placeholder="Ví dụ: BOX" />
          </Form.Item>
        </Form>
      </Modal>
    </main>
  )
}
