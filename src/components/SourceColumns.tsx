import { useEffect, useMemo, useState } from 'react'
import {
  CheckOutlined, ReloadOutlined, SaveOutlined, TableOutlined, UndoOutlined,
} from '@ant-design/icons'
import { Alert, Button, Card, Input, Popconfirm, Skeleton, Tag, Typography, message } from 'antd'
import { api } from '../api'
import type { SourceColumnConfig } from '../types'

const a1Value = (label: string) => label.split('').reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0)

export function SourceColumns() {
  const [config, setConfig] = useState<SourceColumnConfig | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const applyConfig = (next: SourceColumnConfig) => {
    setConfig(next)
    setValues(next.sourceColumns)
  }

  const load = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      applyConfig(await api.sourceColumns())
    } catch (err) {
      setLoadError(true)
      message.error(err instanceof Error ? err.message : 'Không thể tải cấu hình cột nguồn. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    api.sourceColumns()
      .then((next) => {
        if (active) {
          setConfig(next)
          setValues(next.sourceColumns)
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(true)
          message.error(err instanceof Error ? err.message : 'Không thể tải cấu hình cột nguồn. Vui lòng thử lại.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const titles = useMemo(() => {
    if (!config) return []
    return Object.keys(config.sourceColumns).sort((a, b) =>
      a1Value(config.sourceColumns[a]) - a1Value(config.sourceColumns[b]))
  }, [config])

  const changes = useMemo(() => {
    if (!config) return {}
    return Object.fromEntries(Object.entries(values)
      .filter(([title, column]) => column !== config.sourceColumns[title]))
  }, [config, values])

  const invalidTitles = Object.entries(values)
    .filter(([, column]) => !/^[A-Z]+$/.test(column))
    .map(([title]) => title)
  const changedCount = Object.keys(changes).length

  const save = async () => {
    if (!changedCount || invalidTitles.length) return
    setSaving(true)
    try {
      applyConfig(await api.updateSourceColumns(changes))
      message.success(`Đã cập nhật ${changedCount} cột nguồn`)
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể cập nhật cấu hình')
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setSaving(true)
    try {
      applyConfig(await api.resetSourceColumns())
      message.success('Đã khôi phục cấu hình cột mặc định')
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể khôi phục cấu hình')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main id="main-content" className="page-shell" tabIndex={-1}>
      <div className="page-heading source-columns-heading">
        <div>
          <Typography.Text className="eyebrow">SYSTEM CONFIGURATION</Typography.Text>
          <Typography.Title level={1}>SOURCE COLUMNS</Typography.Title>
          <Typography.Paragraph>
            Thiết lập vị trí các cột được đọc khi sao chép dữ liệu từ Google Sheet nguồn.
          </Typography.Paragraph>
        </div>
        <div className="source-column-actions">
          <Popconfirm title="Khôi phục tất cả cột về mặc định?" description="Các vị trí cột tùy chỉnh hiện tại sẽ bị thay thế."
            okText="Khôi phục" cancelText="Hủy" onConfirm={reset}>
            <Button size="large" icon={<UndoOutlined />} disabled={loading || saving || !config}>Khôi phục mặc định</Button>
          </Popconfirm>
          <Button type="primary" size="large" icon={<SaveOutlined />} loading={saving}
            disabled={!changedCount || invalidTitles.length > 0} onClick={save}>
            Lưu thay đổi{changedCount ? ` (${changedCount})` : ''}
          </Button>
        </div>
      </div>

      <Alert className="rules-alert" type="info" showIcon icon={<TableOutlined />}
        message="Các cột được xếp ngang theo thứ tự giống bảng tính Excel."
        description="Nhập chữ cái cột theo định dạng A1, ví dụ E, Z hoặc AA. Giá trị mới áp dụng cho các lần sao chép tiếp theo." />

      <Card className="panel source-columns-panel">
        <div className="rules-panel-title">
          <div><h2>Sơ đồ cột nguồn</h2><p>{titles.length} cột được cấu hình</p></div>
          {changedCount
            ? <Tag color="warning">{changedCount} thay đổi chưa lưu</Tag>
            : <Tag icon={<CheckOutlined />} color="success">Đã đồng bộ</Tag>}
        </div>

        {loading ? <Skeleton active paragraph={{ rows: 5 }} /> : loadError ? (
          <Alert type="error" showIcon message="Chưa thể tải cấu hình cột nguồn."
            action={<Button icon={<ReloadOutlined />} onClick={load}>Thử lại</Button>} />
        ) : config ? (
          <>
            <div className="excel-scroll" tabIndex={0} aria-label="Bảng cấu hình cột nguồn">
              <div className="excel-sheet" style={{ gridTemplateColumns: `repeat(${titles.length}, minmax(88px, 1fr))` }}>
                {titles.map((title) => {
                  const changedFromSaved = values[title] !== config.sourceColumns[title]
                  const changedFromDefault = values[title] !== config.defaultSourceColumns[title]
                  const invalid = invalidTitles.includes(title)
                  return (
                    <div className={`excel-column ${changedFromSaved ? 'is-edited' : ''}`} key={title}>
                      <div className="excel-column-letter">
                        <Input value={values[title]} maxLength={3} status={invalid ? 'error' : undefined}
                          aria-label={`Vị trí cột ${title}`}
                          onChange={(event) => setValues((current) => ({
                            ...current, [title]: event.target.value.trim().toUpperCase(),
                          }))} />
                      </div>
                      <div className="excel-column-title" title={title}>{title}</div>
                      <div className="excel-column-default">
                        Mặc định: <strong>{config.defaultSourceColumns[title]}</strong>
                        {changedFromDefault && <i />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {invalidTitles.length > 0 && (
              <Alert className="source-columns-error" type="error" showIcon
                message="Vị trí cột chỉ được chứa chữ cái A–Z." />
            )}
            <div className="excel-legend">
              <span><i className="default-dot" /> Khác cấu hình mặc định</span>
              <span><i className="edited-dot" /> Thay đổi chưa lưu</span>
              <small>Giữ Shift + con lăn chuột để cuộn ngang</small>
            </div>
          </>
        ) : null}
      </Card>
    </main>
  )
}
