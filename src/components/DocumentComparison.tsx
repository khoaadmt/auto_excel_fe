import { useState } from 'react'
import { FilePdfOutlined, FileSearchOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Empty, Form, Input, Table, Tag, Typography, Upload, message } from 'antd'
import type { UploadFile } from 'antd'
import { api } from '../api'
import type { DocumentComparisonResult, FieldComparison, RowComparison } from '../types'
import { ServiceAccountAccess } from './ServiceAccountAccess'
const FieldValue = ({ value }: { value: FieldComparison }) => <div className={`comparison-field ${value.match ? '' : 'is-mismatch'}`}><span><small>PDF</small>{value.pdf ?? '—'}</span><span><small>GOOGLE SHEET</small>{value.excel ?? '—'}</span></div>
export function DocumentComparison() {
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [data, setData] = useState<DocumentComparisonResult | null>(null)
  const submit = async (values: { spreadsheetUrl: string; sheetName?: string }) => {
    if (!pdfFile) { message.error('Vui lòng chọn file PDF.'); return }
    setLoading(true)
    try { const result = await api.compareDocument({ pdf: pdfFile, ...values }); setData(result); message.success('Đã đối chiếu PDF với Google Sheet') }
    catch (e) { message.error(e instanceof Error ? e.message : 'Không thể đối chiếu chứng từ.') }
    finally { setLoading(false) }
  }
  const columns = [
    { title: 'STT', dataIndex: 'rowNumber', width: 65 },
    { title: 'TÊN HÀNG', dataIndex: ['fields', 'nameOfGood'], render: (v: FieldComparison) => <FieldValue value={v} /> },
    { title: 'MÃ HS', dataIndex: ['fields', 'hsCode'], render: (v: FieldComparison) => <FieldValue value={v} /> },
    { title: 'SỐ LƯỢNG', dataIndex: ['fields', 'quantity'], render: (v: FieldComparison, row: RowComparison) => <><FieldValue value={v} />{row.pdfQuantityUnit && <small>Đơn vị PDF: {row.pdfQuantityUnit}</small>}</> },
  ]
  const summary = data ? [['PDF', data.summary.pdfRows], ['Google Sheet', data.summary.excelRows], ['Đã khớp', data.summary.matchedRows], ['Sai lệch', data.summary.mismatchedRows], ['Thiếu PDF', data.summary.missingInPdf], ['Thiếu Sheet', data.summary.missingInExcel]] : []
  return <main id='main-content' className='page-shell' tabIndex={-1}>
    <div className='page-heading'><div><Typography.Text className='eyebrow'>DOCUMENT VALIDATION</Typography.Text><Typography.Title level={1}>COMPARE PDF & GOOGLE SHEET</Typography.Title><Typography.Paragraph>Đối chiếu tên hàng, mã HS và số lượng theo STT giữa chứng từ PDF và Google Sheet.</Typography.Paragraph></div><Tag color='success'>Sẵn sàng</Tag></div>
    <Card className='panel comparison-form-panel'><Form layout='vertical' requiredMark={false} onFinish={submit}><div className='comparison-form-grid'>
      <Form.Item label='Chứng từ PDF' required><Upload.Dragger accept='.pdf,application/pdf' maxCount={1} fileList={files} beforeUpload={f => { if ((!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') || f.size > 15*1024*1024) { message.error('Chỉ nhận PDF tối đa 15 MB.'); return Upload.LIST_IGNORE }; setFiles([f]); setPdfFile(f); return false }} onRemove={() => { setFiles([]); setPdfFile(null); return true }}><FilePdfOutlined className='comparison-upload-icon'/><p>Kéo thả hoặc chọn file PDF</p><span>Tối đa 15 MB · PDF có lớp văn bản</span></Upload.Dragger></Form.Item>
      <div><Form.Item name='spreadsheetUrl' label='Link Google Sheets' rules={[{ required: true, message: 'Vui lòng nhập link' }, { pattern: /^https:\/\/docs\.google\.com\/spreadsheets\/d\//, message: 'Link Google Sheets chưa hợp lệ' }]}><Input size='large' placeholder='https://docs.google.com/spreadsheets/d/...'/></Form.Item><Form.Item name='sheetName' label='Tên tab (tùy chọn)' extra='Để trống để tự tìm tab phù hợp.'><Input size='large' maxLength={100}/></Form.Item><Alert type='info' showIcon icon={<InfoCircleOutlined/>} message='Chia sẻ quyền Viewer cho service account của hệ thống.'/></div>
    </div><div className='comparison-form-footer'><ServiceAccountAccess description='Cấp quyền Viewer cho service account trước khi đối chiếu:'/><Button className='comparison-submit' size='large' type='primary' htmlType='submit' loading={loading} disabled={!pdfFile} icon={<FileSearchOutlined/>}>{loading ? 'Đang đối chiếu...' : 'So sánh'}</Button></div></Form></Card>
    {data && <Card className='panel comparison-results'><div className='comparison-result-head'><div><h2>Kết quả đối chiếu</h2><p>Tab <strong>{data.sheetName}</strong> · các dòng cần xử lý</p></div></div>
      <div className='comparison-summary'>{summary.map(([label,value]) => <div key={String(label)}><strong>{value}</strong><span>{label}</span></div>)}</div>
      {data.rows.length ? <Table<RowComparison> className='comparison-table' rowKey='rowNumber' columns={columns} dataSource={data.rows} scroll={{x:900}} pagination={{pageSize:10}}/> : <Empty description='Không có dòng lỗi'/>}
    </Card>}
  </main>
}
