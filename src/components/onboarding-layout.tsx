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
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
      <section className="w-full max-w-2xl">
        <Card className="overflow-hidden">
          <CardContent>
            {children}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export { OnboardingLayout }
