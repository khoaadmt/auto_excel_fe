import { CopyOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { Alert, Button, message } from 'antd'

const SERVICE_ACCOUNT_EMAIL = 'sheet-translator@flash-clover-378404.iam.gserviceaccount.com'

export function ServiceAccountAccess({ description }: { description: string }) {
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SERVICE_ACCOUNT_EMAIL)
      message.success('Đã sao chép email service account')
    } catch {
      message.error('Không thể sao chép email')
    }
  }

  return <Alert className='info-alert copy-info' type='info' showIcon icon={<InfoCircleOutlined />}
    message={<div className='service-account-info'><span>{description}</span><code>{SERVICE_ACCOUNT_EMAIL}</code></div>}
    action={<Button size='small' icon={<CopyOutlined />} onClick={copyEmail}>Sao chép email</Button>} />
}
