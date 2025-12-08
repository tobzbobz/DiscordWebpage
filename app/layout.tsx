import type { Metadata } from "next"
import "./globals.css"
import GlobalWrapper from "./components/GlobalWrapper"

export const metadata: Metadata = {
  title: "Discord Login",
  description: "Discord OAuth Login App",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <GlobalWrapper>
          {children}
        </GlobalWrapper>
      </body>
    </html>
  )
}
