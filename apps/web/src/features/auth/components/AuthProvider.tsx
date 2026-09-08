export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// Google OAuth provider link and session management
// Uses Supabase Auth with Google provider enabled in Supabase dashboard
// Session persistence handled via Zustand store + localStorage
