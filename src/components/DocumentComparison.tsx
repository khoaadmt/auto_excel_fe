import { useState } from 'react'
import { FileExcelOutlined, FilePdfOutlined, FileSearchOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Form, Table, Tag, Typography, Upload, message } from 'antd'
import type { UploadFile } from 'antd'
import { api } from '../api'
import type { DocumentComparisonResult, FieldComparison, RowComparison } from '../types'

const MAX_FILE_SIZE = 15 * 1024 * 1024
const FieldValue = ({ value }: { value?: FieldComparison }) => <div className={`comparison-field ${value && !value.match ? 'is-mismatch' : ''}`}><span><small>PDF</small>{value?.pdf ?? '—'}</span><span><small>EXCEL</small>{value?.excel ?? '—'}</span></div>

export function DocumentComparison() {
  const [loading, setLoading] = useState(false)
  const [pdfFiles, setPdfFiles] = useState<UploadFile[]>([])
  const [excelFiles, setExcelFiles] = useState<UploadFile[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [data, setData] = useState<DocumentComparisonResult | null>(null)
  const submit = async () => {
    if (!pdfFile || !excelFile) { message.error('Vui lòng chọn đầy đủ file PDF và Excel.'); return }
    setLoading(true)
    try { const result = await api.compareDocument({ pdf: pdfFile, excel: excelFile }); setData(result); message.success('Đã đối chiếu PDF với file Excel') }
    catch (error) { message.error(error instanceof Error ? error.message : 'Không thể đối chiếu chứng từ.') }
    finally { setLoading(false) }
  }
  const columns = [
    { title: 'STT', dataIndex: 'rowNumber', width: 58 },
    { title: 'TÊN HÀNG', dataIndex: ['fields', 'nameOfGood'], width: '34%', render: (value: FieldComparison) => <FieldValue value={value} /> },
    { title: 'MÃ HS', dataIndex: ['fields', 'hsCode'], width: '20%', render: (value: FieldComparison) => <FieldValue value={value} /> },
    { title: 'SỐ LƯỢNG', dataIndex: ['fields', 'quantity'], width: '22%', render: (value: FieldComparison) => <FieldValue value={value} /> },
    { title: 'ĐƠN VỊ', dataIndex: ['fields', 'quantityUnit'], width: '18%', render: (value?: FieldComparison) => <FieldValue value={value} /> },
  ]
  const summary = data ? [['PDF', data.summary.pdfRows], ['Excel', data.summary.excelRows], ['Đã khớp', data.summary.matchedRows], ['Sai lệch', data.summary.mismatchedRows], ['Thiếu PDF', data.summary.missingInPdf], ['Thiếu Excel', data.summary.missingInExcel]] : []
  return <main id='main-content' className='page-shell' tabIndex={-1}>
    <div className='page-heading'><div><Typography.Text className='eyebrow'>DOCUMENT VALIDATION</Typography.Text><Typography.Title level={1}>COMPARE PDF & EXCEL</Typography.Title><Typography.Paragraph>Đối chiếu tên hàng, mã HS và số lượng theo STT giữa chứng từ PDF và file Excel.</Typography.Paragraph></div><Tag color='success'>Sẵn sàng</Tag></div>
    <Card className='panel comparison-form-panel'><Form layout='vertical' requiredMark={false} onFinish={submit}><div className='comparison-form-grid'>
      <Form.Item label='Chứng từ PDF' required><Upload.Dragger accept='.pdf,application/pdf' maxCount={1} fileList={pdfFiles} beforeUpload={file => { if ((!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') || file.size > MAX_FILE_SIZE) { message.error('Chỉ nhận PDF tối đa 15 MB.'); return Upload.LIST_IGNORE }; setPdfFiles([file]); setPdfFile(file); setData(null); return false }} onRemove={() => { setPdfFiles([]); setPdfFile(null); setData(null); return true }}><FilePdfOutlined className='comparison-upload-icon comparison-upload-icon-pdf'/><p>Kéo thả hoặc chọn file PDF</p><span>Tối đa 15 MB · PDF có lớp văn bản</span></Upload.Dragger></Form.Item>
      <Form.Item label='Dữ liệu Excel' required><Upload.Dragger accept='.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel' maxCount={1} fileList={excelFiles} beforeUpload={file => { if (!/\.(xlsx|xls)$/i.test(file.name) || file.size > MAX_FILE_SIZE) { message.error('Chỉ nhận file Excel .xlsx hoặc .xls tối đa 15 MB.'); return Upload.LIST_IGNORE }; setExcelFiles([file]); setExcelFile(file); setData(null); return false }} onRemove={() => { setExcelFiles([]); setExcelFile(null); setData(null); return true }}><FileExcelOutlined className='comparison-upload-icon comparison-upload-icon-excel'/><p>Kéo thả hoặc chọn file Excel</p><span>Tối đa 15 MB · định dạng XLSX hoặc XLS</span></Upload.Dragger></Form.Item>
    </div><div className='comparison-form-footer'><Button className='comparison-submit' size='large' type='primary' htmlType='submit' loading={loading} disabled={!pdfFile || !excelFile} icon={<FileSearchOutlined/>}>{loading ? 'Đang đối chiếu...' : 'So sánh'}</Button></div></Form></Card>
    {data && <Card className='panel comparison-results'><div className='comparison-result-head'><div><h2>Kết quả đối chiếu</h2><p>File <strong>{data.excelFileName}</strong> · sheet <strong>{data.sheetName}</strong></p></div></div><div className='comparison-summary'>{summary.map(([label, value]) => <div key={String(label)}><strong>{value}</strong><span>{label}</span></div>)}</div>{data.rows.length ? <Table<RowComparison> className='comparison-table' rowKey='rowNumber' columns={columns} dataSource={data.rows} tableLayout='fixed' scroll={{ x: 780 }} pagination={{ pageSize: 10 }}/>: <Empty description='Không có dòng lỗi'/>}</Card>}
  </main>
}
