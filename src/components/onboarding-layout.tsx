import { Outlet } from 'react-router-dom'

import {
  Card,
  CardContent,
} from '@/components/ui/card'

export const OnboardingLayout = () => {
  return (
    <main className="min-h-screen">
      <div className="flex min-h-screen items-center justify-center">
        <section className="w-full max-w-2xl">
          <Card className="overflow-hidden">
            <CardContent>
              <Outlet />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
