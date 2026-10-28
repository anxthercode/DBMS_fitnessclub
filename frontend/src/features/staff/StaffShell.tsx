import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { StaffAccountLinks } from './StaffAccount'
import { useWords } from './shared'

export type StaffGroup = { label: string; items: [string, string][] }
export function StaffShell({ title, section, groups, children }: { title: string; section: string; groups: StaffGroup[]; children: ReactNode }) {
  const w = useWords()
  const [, setParams] = useSearchParams()
  const select = (value: string) => setParams({ section: value })
  const active = groups.flatMap(group => group.items).find(([key]) => key === section)?.[1] || (section === 'profile' ? w('Профиль', 'Profile') : w('Уведомления', 'Notifications'))
  return <section className="container-shell page-section staff-page">
    <div className="staff-heading"><h1 className="page-title">{title}</h1><StaffAccountLinks /></div>
    <div className="staff-shell">
      <aside className="staff-sidebar"><nav aria-label={w('Разделы кабинета', 'Workspace sections')}>{groups.map(group => <div className="staff-nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([key, label]) => <button key={key} aria-current={section === key ? 'page' : undefined} onClick={() => select(key)}>{label}<span aria-hidden="true">↗</span></button>)}</div>)}</nav></aside>
      <label className="staff-mobile-nav">{w('Раздел кабинета', 'Workspace section')}<select value={section} onChange={e => select(e.target.value)}>{groups.map(group => <optgroup label={group.label} key={group.label}>{group.items.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</optgroup>)}<optgroup label={w('Аккаунт', 'Account')}><option value="profile">{w('Профиль', 'Profile')}</option><option value="notifications">{w('Уведомления', 'Notifications')}</option></optgroup></select></label>
      <div className="staff-content" key={section}><div className="staff-section-title">{active}</div>{children}</div>
    </div>
  </section>
}
