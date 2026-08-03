import { CheckCircleFilled, WarningFilled } from '@ant-design/icons'
import { Empty, Table, Tag, type TableProps } from 'antd'

type Props<T extends object> = {
  items: T[]
  columns: TableProps<T>['columns']
  summary: { label: string; value: number | string; tone?: 'success' | 'warning' }[]
  card: (item: T, index: number) => React.ReactNode
  emptyDescription?: string
}

export function ResponsiveResults<T extends object>({ items, columns, summary, card, emptyDescription = 'Không phát hiện sai lệch' }: Props<T>) {
  return (
    <div>
      <div className="result-summary">
        {summary.map((item) => (
          <div className="summary-item" key={item.label}>
            {item.tone === 'success' ? <CheckCircleFilled className="success-icon" /> : <WarningFilled className="warning-icon" />}
            <div><strong>{item.value}</strong><span>{item.label}</span></div>
          </div>
        ))}
      </div>
      {items.length ? (
        <>
          <Table className="desktop-table" rowKey={(_, i) => String(i)} columns={columns} dataSource={items} pagination={{ pageSize: 6, hideOnSinglePage: true }} />
          <div className="mobile-cards">{items.map(card)}</div>
        </>
      ) : <Empty description={<Tag color="success">{emptyDescription}</Tag>} />}
    </div>
  )
}
