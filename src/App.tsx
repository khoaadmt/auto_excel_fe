import { useEffect, useState } from 'react'
import {
  AuditOutlined, BarsOutlined, BoxPlotOutlined, CloseOutlined, CopyOutlined, FileExcelOutlined,
  LogoutOutlined, MenuOutlined, SettingOutlined, SwapOutlined, TableOutlined,
} from '@ant-design/icons'
import { Button, ConfigProvider, Drawer, Layout, Menu, Tag, Typography } from 'antd'
import type { MenuProps, TableProps } from 'antd'
import { api } from './api'
import { ToolPage } from './components/ToolPage'
import { ResponsiveResults } from './components/ResponsiveResults'
import { UnitRules } from './components/UnitRules'
import { GoogleSheetContext } from './components/GoogleSheetContext'
import { CopySourceSheet } from './components/CopySourceSheet'
import { Login } from './components/Login'
import { SourceColumns } from './components/SourceColumns'
import type { ColumnDefaults, ModelInvalidRow, PackageGroup, UnitInvalidRow } from './types'

type Page = 'copy' | 'units' | 'model' | 'packages' | 'source-columns' | 'rules'

const menuItems: MenuProps['items'] = [
  { type: 'group', label: 'DATA OPERATIONS', children: [
    { key: 'copy', icon: <CopyOutlined />, label: 'COPY SOURCE SHEET' },
    { key: 'units', icon: <AuditOutlined />, label: 'CHECK UNITS' },
    { key: 'model', icon: <SwapOutlined />, label: 'CHECK MODEL & BRAND' },
    { key: 'packages', icon: <BoxPlotOutlined />, label: 'SUM PACKAGES' },
  ] },
  { type: 'group', label: 'CONFIGURATION', children: [
    { key: 'source-columns', icon: <TableOutlined />, label: 'SOURCE COLUMNS' },
    { key: 'rules', icon: <SettingOutlined />, label: 'UNIT RULES' },
  ] },
]

const unitColumns: TableProps<UnitInvalidRow>['columns'] = [
  { title: 'ROW', dataIndex: 'rowNumber', width: 70, render: (v) => <Tag>{v}</Tag> },
  { title: 'DESCRIPTION OF GOODS', dataIndex: 'description', render: (v) => <span className="multiline">{v}</span> },
  { title: 'ACTUAL UNIT', dataIndex: 'actualUnit', render: (v) => <Tag color="error">{v}</Tag> },
  { title: 'EXPECTED UNIT', dataIndex: 'expectedUnit', render: (v) => <Tag color="success">{v}</Tag> },
]

const modelColumns: TableProps<ModelInvalidRow>['columns'] = [
  { title: 'ROW', dataIndex: 'rowNumber', width: 70, render: (v) => <Tag>{v}</Tag> },
  { title: 'DESCRIPTION OF GOODS', dataIndex: 'sourceValue', render: (v) => <span className="multiline">{v}</span> },
  { title: 'SPM', dataIndex: 'referenceValue', render: (v) => <span className="multiline">{v}</span> },
  { title: 'MISMATCHES', dataIndex: 'mismatches', render: (items) => items.map((m: ModelInvalidRow['mismatches'][number]) =>
    <Tag key={m.field} color="warning">{m.field}: {m.actual} → {m.expected}</Tag>) },
]

const packageColumns: TableProps<PackageGroup>['columns'] = [
  { title: 'LINK', dataIndex: 'link', ellipsis: true, render: (v) => <a href={v} target="_blank" rel="noreferrer">{v}</a> },
  { title: 'ROWS', dataIndex: 'rowNumbers', render: (v: number[]) => v.join(', ') },
  { title: 'TOTAL PACKAGES', dataIndex: 'totalPackages', align: 'right', render: (v) => <strong className="package-total">{v}</strong> },
]

export function App() {
  const [authenticated, setAuthenticated] = useState(api.hasSession)
  const [page, setPage] = useState<Page>('units')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [defaults, setDefaults] = useState<ColumnDefaults>({
    checkUnits: { 'DESCRIPTION OF GOODS': 'F', UNIT: 'K' },
    checkModelBrand: { 'DESCRIPTION OF GOODS': 'F', SPM: 'V' },
    sumPackages: { LINK: 'A', NO: 'C', PACKAGE: 'N' },
  })

  useEffect(() => { document.querySelector<HTMLElement>('#main-content')?.focus() }, [page])
  useEffect(() => {
    if (authenticated) api.defaults().then(setDefaults).catch(() => undefined)
  }, [authenticated])
  useEffect(() => {
    const sessionExpired = () => setAuthenticated(false)
    window.addEventListener('excelflow:auth-expired', sessionExpired)
    return () => window.removeEventListener('excelflow:auth-expired', sessionExpired)
  }, [])

  const navigate: MenuProps['onClick'] = ({ key }) => {
    setPage(key as Page)
    setDrawerOpen(false)
  }

  const nav = <Menu mode="inline" selectedKeys={[page]} items={menuItems} onClick={navigate} />

  const content = page === 'copy' ? <CopySourceSheet /> : page === 'units' ? (
    <ToolPage key={`units-${JSON.stringify(defaults.checkUnits)}`} eyebrow="DATA VALIDATION" title="CHECK UNITS"
      description="Đối chiếu đơn vị đóng gói trong mô tả hàng hóa với cột UNIT."
      fields={[{ name: 'DESCRIPTION OF GOODS', label: 'DESCRIPTION OF GOODS', defaultValue: defaults.checkUnits['DESCRIPTION OF GOODS'] }, { name: 'UNIT', label: 'UNIT', defaultValue: defaults.checkUnits.UNIT }]}
      run={api.checkUnits}
      result={(data) => <ResponsiveResults items={data.invalidRows} columns={unitColumns}
        summary={[{ label: 'dòng đã kiểm tra', value: data.checkedRows, tone: 'success' }, { label: 'dòng cần xem lại', value: data.invalidRows.length, tone: 'warning' }]}
        card={(row) => <div className="result-card" key={row.rowNumber}><Tag>Dòng {row.rowNumber}</Tag><p>{row.description}</p>
          <div><span>Thực tế <Tag color="error">{row.actualUnit}</Tag></span><span>Kỳ vọng <Tag color="success">{row.expectedUnit}</Tag></span></div></div>} />}
    />
  ) : page === 'model' ? (
    <ToolPage key={`model-${JSON.stringify(defaults.checkModelBrand)}`} eyebrow="DATA VALIDATION" title="CHECK MODEL & BRAND"
      description="So sánh model, thương hiệu trong mô tả hàng hóa với dữ liệu tham chiếu SPM."
      fields={[{ name: 'DESCRIPTION OF GOODS', label: 'DESCRIPTION OF GOODS', defaultValue: defaults.checkModelBrand['DESCRIPTION OF GOODS'] }, { name: 'SPM', label: 'SPM', defaultValue: defaults.checkModelBrand.SPM }]}
      run={api.checkModelBrand}
      result={(data) => <ResponsiveResults items={data.invalidRows} columns={modelColumns}
        summary={[{ label: 'dòng đã kiểm tra', value: data.checkedRows, tone: 'success' }, { label: 'dòng có sai lệch', value: data.invalidRows.length, tone: 'warning' }]}
        card={(row) => <div className="result-card" key={row.rowNumber}><Tag>Dòng {row.rowNumber}</Tag><p>{row.sourceValue}</p>
          {row.mismatches.map((m) => <Tag color="warning" key={m.field}>{m.field}: {m.actual} → {m.expected}</Tag>)}</div>} />}
    />
  ) : page === 'packages' ? (
    <ToolPage key={`packages-${JSON.stringify(defaults.sumPackages)}`} eyebrow="DATA AGGREGATION" title="SUM PACKAGES"
      description="Nhóm dữ liệu theo liên kết đơn hàng và tính tổng số kiện của từng nhóm."
      fields={[{ name: 'LINK', label: 'LINK', defaultValue: defaults.sumPackages.LINK }, { name: 'NO', label: 'NO', defaultValue: defaults.sumPackages.NO }, { name: 'PACKAGE', label: 'PACKAGE', defaultValue: defaults.sumPackages.PACKAGE }]}
      run={api.sumPackages}
      result={(data) => <ResponsiveResults items={data.groups} columns={packageColumns}
        summary={[{ label: 'nhóm liên kết', value: data.totalGroups, tone: 'success' }, { label: 'tổng số kiện', value: data.totalPackages, tone: 'success' }]}
        card={(group, i) => <div className="result-card" key={i}><a href={group.link}>{group.link}</a>
          <div><span>Dòng: {group.rowNumbers.join(', ')}</span><strong>{group.totalPackages} kiện</strong></div></div>} />}
    />
  ) : page === 'source-columns' ? <SourceColumns /> : <UnitRules />

  return (
    <ConfigProvider theme={{ token: {
      colorPrimary: '#16845b', colorInfo: '#16845b', borderRadius: 10,
      fontFamily: "'Inter', 'Segoe UI', sans-serif", colorText: '#17201d',
      colorBgLayout: '#f5f7f6', controlHeightLG: 46,
    }, components: { Button: { primaryShadow: 'none' }, Layout: { siderBg: '#ffffff' }, Menu: { itemHeight: 46, itemBorderRadius: 8 } } }}>
      {!authenticated ? <Login onSuccess={() => setAuthenticated(true)} /> : (
      <>
      <a href="#main-content" className="skip-link">Bỏ qua đến nội dung chính</a>
      <Layout className="app-layout">
        <Layout.Sider width={288} className="desktop-sider">
          <Brand />
          <nav aria-label="Điều hướng chính">{nav}</nav>
          <SidebarFooter onLogout={api.logout} />
        </Layout.Sider>
        <Layout>
          <header className="mobile-header">
            <Brand compact />
            <Button aria-label="Mở menu" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />
          </header>
          <div className="sheet-context-shell">
            <GoogleSheetContext />
          </div>
          <Layout.Content>{content}</Layout.Content>
        </Layout>
      </Layout>
      <Drawer placement="left" width={300} open={drawerOpen} onClose={() => setDrawerOpen(false)}
        closeIcon={<CloseOutlined />} title={<Brand compact />}>
        <nav aria-label="Điều hướng mobile">{nav}</nav><SidebarFooter onLogout={api.logout} />
      </Drawer>
      </>
      )}
    </ConfigProvider>
  )
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><div className="brand-mark"><FileExcelOutlined /></div>
    <div><Typography.Title level={4}>ExcelFlow</Typography.Title>{!compact && <span>Data operations</span>}</div></div>
}

function SidebarFooter({ onLogout }: { onLogout: () => void }) {
  return <div className="sidebar-footer"><BarsOutlined /><div><strong>{api.currentUser()?.username ?? 'Đã đăng nhập'}</strong>
    <span>Sẵn sàng xử lý dữ liệu</span></div>
    <Button type="text" size="small" danger icon={<LogoutOutlined />} aria-label="Đăng xuất" onClick={onLogout} />
  </div>
}
