"use client"

import { ReactNode } from 'react'
import BroadcastBar from './BroadcastBar'
import AnnouncementPopup from './AnnouncementPopup'
import AccessGuard from './AccessGuard'

interface GlobalWrapperProps {
  children: ReactNode;
}

export default function GlobalWrapper({ children }: GlobalWrapperProps) {
  return (
    <AccessGuard>
      <BroadcastBar />
      <AnnouncementPopup />
      <div style={{ paddingTop: 'var(--broadcast-height, 0px)' }}>
        {children}
      </div>
    </AccessGuard>
  )
}
