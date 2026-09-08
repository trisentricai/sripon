// PhonePe Payment Integration (Backend Only)
// All PhonePe credentials are server-only (never exposed to frontend)

export interface PhonePeConfig {
  merchantId: string
  saltKey: string
  saltIndex: number
  environment: 'PRODUCTION' | 'SANDBOX'
  baseUrl: string
}

export function getPhonePeConfig(): PhonePeConfig {
  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID || '',
    saltKey: process.env.PHONEPE_SALT_KEY || '',
    saltIndex: parseInt(process.env.PHONEPE_SALT_INDEX || '1'),
    environment: (process.env.PHONEPE_ENVIRONMENT as 'PRODUCTION' | 'SANDBOX') || 'SANDBOX',
    baseUrl: process.env.PHONEPE_BASE_URL || 'https://api.phonepe.com',
  }
}

export function getPhonePeBaseUrl(): string {
  const config = getPhonePeConfig()
  return config.baseUrl
}
