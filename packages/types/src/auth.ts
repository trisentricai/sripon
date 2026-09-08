export interface UserProfile {
  id: string
  email: string
  name: string
  role: 'customer' | 'staff' | 'admin' | 'super_admin'
  avatarUrl?: string
  phone?: string
  createdAt: string
  updatedAt: string
  isVerified: boolean
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  user: UserProfile
  expiresAt: number
}
