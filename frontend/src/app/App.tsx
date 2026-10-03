import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
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

const CartPage = lazy(async () => ({ default: (await import('@/features/commerce/CartPage')).CartPage }))
const OrdersPage = lazy(async () => ({ default: (await import('@/features/commerce/OrdersPage')).OrdersPage }))
const OrderPage = lazy(async () => ({ default: (await import('@/features/commerce/OrdersPage')).OrderPage }))
const AccessPage = lazy(async () => ({ default: (await import('@/features/commerce/AccessPage')).AccessPage }))

const OverviewPage = lazy(async () => ({ default: (await import('@/features/account/OverviewPage')).OverviewPage }))
const SchedulePage = lazy(async () => ({ default: (await import('@/features/training/SchedulePage')).SchedulePage }))
const SlotPage = lazy(async () => ({ default: (await import('@/features/training/SchedulePage')).SlotPage }))
const BookingsPage = lazy(async () => ({ default: (await import('@/features/training/BookingsPage')).BookingsPage }))
const BookingPage = lazy(async () => ({ default: (await import('@/features/training/BookingsPage')).BookingPage }))
const NotificationsPage = lazy(async () => ({ default: (await import('@/features/training/NotificationsPage')).NotificationsPage }))
const RecoveryPage = lazy(async () => ({ default: (await import('@/features/auth/RecoveryPage')).RecoveryPage }))

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
          <Route path="cart" element={<Suspense fallback={<Loading />}><CartPage /></Suspense>} />
          <Route path="schedule" element={<Suspense fallback={<Loading />}><SchedulePage /></Suspense>} />
          <Route path="schedule/:id" element={<Suspense fallback={<Loading />}><SlotPage /></Suspense>} />
          <Route path="recover" element={<Suspense fallback={<Loading />}><RecoveryPage /></Suspense>} />
          <Route path="trainers" element={<TrainersPage />} />
          <Route path="login" element={<AuthRoute mode="login" />} />
          <Route path="register" element={<AuthRoute mode="register" />} />
          <Route path="account" element={<ClientGuard />}>
            <Route element={<Suspense fallback={<Loading />}><AccountLayout /></Suspense>}>
              <Route index element={<OverviewPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="bookings/:id" element={<BookingPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderPage />} />
              <Route path="access/:id" element={<AccessPage />} />
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
