import { request } from './http'

export interface VisitApplication {
  id: string; name: string; phone: string; status: string; created_at: string
  visit_date: string | null; zones: string; decided_at: string | null; used_at: string | null
}
export interface VisitAccount {
  id: string; first_name: string; last_name: string; email: string; phone: string; role: string; is_active: boolean
}
export interface VisitHistoryEntry {
  id: string; kind: 'first_visit' | 'pass' | 'membership' | 'training'; person_name: string
  status: string; zones: string; attendance_evidence: boolean; recorded_at: string
  occurred_at?: string | null; starts_at?: string; ends_at?: string; visit_date?: string | null
  decided_at?: string | null; actor_name?: string | null; trainer_name?: string
  order_id?: string; client_id?: string
}
export interface VisitDetail { application: VisitApplication; accounts: VisitAccount[]; history: VisitHistoryEntry[] }
export const firstVisitDetail = (id: string) => request<VisitDetail>('/admin/first-visits/' + encodeURIComponent(id))
