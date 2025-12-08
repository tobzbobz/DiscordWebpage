"use client"

import { useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getCurrentUser } from '../utils/userService'
import { checkUserAccess, UserAccess, ADMIN_DISCORD_ID } from '../utils/apiClient'

interface AccessGuardProps {
  children: ReactNode;
}

export default function AccessGuard({ children }: AccessGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [access, setAccess] = useState<UserAccess | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  // Pages that don't require login
  const publicPages = ['/', '/logon', '/share']
  const isPublicPage = publicPages.some(p => pathname === p || pathname?.startsWith('/share/'))

  useEffect(() => {
    const checkAccess = async () => {
      // Skip check for public pages
      if (isPublicPage) {
        setIsChecking(false)
        setAccess({ canView: true, canEdit: true, isAdmin: false, isOwner: false })
        return
      }

      const user = getCurrentUser()
      if (!user) {
        setIsChecking(false)
        return
      }

      try {
        const userAccess = await checkUserAccess(user.discordId)
        setAccess(userAccess)
      } catch (error) {
        console.error('Access check failed:', error)
        // Default to full access on error to not block users
        setAccess({ canView: true, canEdit: true, isAdmin: false, isOwner: false })
      } finally {
        setIsChecking(false)
      }
    }

    checkAccess()
    
    // Re-check access every 2 minutes
    const interval = setInterval(checkAccess, 120000)
    return () => clearInterval(interval)
  }, [pathname, isPublicPage])

  // Still checking
  if (isChecking) {
    return <>{children}</>
  }

  // No access object yet for public page
  if (isPublicPage) {
    return <>{children}</>
  }

  // User is blocked (hard ban or whitelist restriction)
  if (access?.blocked) {
    return (
      <div className="access-blocked">
        <style jsx>{`
          .access-blocked {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #0d1b2a;
            color: white;
            text-align: center;
            padding: 20px;
          }
          .blocked-icon {
            font-size: 80px;
            margin-bottom: 20px;
          }
          .blocked-title {
            font-size: 28px;
            margin-bottom: 10px;
            color: #dc3545;
          }
          .blocked-text {
            font-size: 16px;
            color: #8899aa;
            margin-bottom: 30px;
            max-width: 400px;
          }
        `}</style>
        <div className="blocked-icon">🚫</div>
        <h1 className="blocked-title">Access Denied</h1>
        <p className="blocked-text">
          {access.reason || 'You do not have permission to access this system.'}
        </p>
      </div>
    )
  }

  // Store access in window for other components to use
  if (typeof window !== 'undefined' && access) {
    (window as any).__userAccess = access
  }

  return <>{children}</>
}

// Hook to get current access state
export function useAccess(): UserAccess {
  const [access, setAccess] = useState<UserAccess>({ canView: true, canEdit: true, isAdmin: false, isOwner: false })

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__userAccess) {
      setAccess((window as any).__userAccess)
    }
  }, [])

  return access
}

// Higher-order component for edit-protected actions
export function withEditAccess<P extends object>(
  WrappedComponent: React.ComponentType<P & { canEdit: boolean }>
) {
  return function WithEditAccessComponent(props: P) {
    const access = useAccess()
    return <WrappedComponent {...props} canEdit={access.canEdit} />
  }
}
