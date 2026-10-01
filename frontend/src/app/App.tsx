import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { FeedbackProvider, Loading } from '@/components/feedback'
import { PublicLayout } from './PublicLayout'
import { HomePage } from '@/features/public/HomePage'
import { NotFoundPage } from '@/features/public/NotFoundPage'
import { PlansPage } from '@/features/memberships/PlansPage'
import { TrainersPage } from '@/features/trainers/TrainersPage'
import { ClientGuard } from '@/features/account/ClientGuard'
const AuthPage = lazy(async () => ({ default: (await import('@/features/auth/AuthPage')).AuthPage }))
const AccountLayout = lazy(async () => ({ default: (await import('@/features/account/AccountLayout')).AccountLayout }))
const ProfilePage = lazy(async () => ({ default: (await import('@/features/account/ProfilePage')).ProfilePage }))
const MembershipsPage = lazy(async () => ({ default: (await import('@/features/account/MembershipsPage')).MembershipsPage }))

function AuthRoute({ mode }: { mode: 'login' | 'register' }) {
  return <Suspense fallback={<Loading />}><AuthPage key={mode} mode={mode} /></Suspense>
}

export function App() {
  return (
    <FeedbackProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="design-preview" element={<HomePage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="trainers" element={<TrainersPage />} />
          <Route path="login" element={<AuthRoute mode="login" />} />
          <Route path="register" element={<AuthRoute mode="register" />} />
          <Route path="account" element={<ClientGuard />}>
            <Route element={<Suspense fallback={<Loading />}><AccountLayout /></Suspense>}>
              <Route index element={<Navigate to="memberships" replace />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="memberships" element={<MembershipsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </FeedbackProvider>
  )
}
