import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

type OnboardingLayoutProps = {
  children: ReactNode
}

function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-xl">
        <Card className="overflow-hidden">
          <CardContent>
            {children}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export { OnboardingLayout }
