export interface Notification {
  id: string
  userId: string
  type: string // ORDER, PAYMENT, SHIPPING, DELIVERY, ADMIN_ALERT
  title: string
  body: string
  data: Record<string, unknown>
  isRead: boolean
  readAt?: string
  createdAt: string
}
