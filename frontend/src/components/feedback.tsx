import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, LoaderCircle, Inbox, X } from 'lucide-react'
import { ApiError } from '@/api/types'
import { Button } from './ui/button'
const ToastContext = createContext<(text: string, error?: boolean) => void>(() => {})
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [notice,setNotice] = useState<{text:string;error:boolean;key:number}|null>(null)
  const {t}=useTranslation()
  useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(null),6500);return()=>clearTimeout(id)},[notice])
  return <ToastContext.Provider value={(text,error=false)=>setNotice({text,error,key:Date.now()})}>{children}{notice&&<div role={notice.error?'alert':'status'} className="fixed bottom-5 left-4 right-4 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-md border border-border bg-card p-4 shadow-xl">{notice.error?<AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive"/>:<CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success"/>}<p className="flex-1 text-sm">{notice.text}</p><button aria-label={t('common.close')} onClick={()=>setNotice(null)}><X className="size-4"/></button></div>}</ToastContext.Provider>
}
export const useToast=()=>useContext(ToastContext)
export function useAction<T, R>(fn: (input:T)=>Promise<R>, success?: (data:R)=>void) {
  const client=useQueryClient();const toast=useToast();const {t}=useTranslation()
  return useMutation({mutationFn:fn,onSuccess:async data=>{await client.invalidateQueries(); if(success)success(data);else toast(t('common.success'))},onError:error=>toast(t(`error.${error instanceof ApiError?error.code:'unknown'}`,{defaultValue:t('error.unknown')}),true)})
}
export function Loading() { const {t}=useTranslation();return <div role="status" className="flex min-h-40 items-center justify-center gap-3 text-muted-foreground"><LoaderCircle className="size-5 animate-spin"/>{t('common.loading')}</div> }
export function QueryError({retry}: {retry:()=>void}) {const{t}=useTranslation();return <div role="alert" className="rounded-md border border-destructive/50 bg-card p-6"><p>{t('error.network')}</p><Button className="mt-4" variant="outline" onClick={retry}>{t('common.retry')}</Button></div>}
export function Empty({title,children}:{title?:string;children?:ReactNode}) {const{t}=useTranslation();return <div className="rounded-md border border-dashed border-border px-6 py-14 text-center"><Inbox className="mx-auto mb-4 size-9 text-muted-foreground"/><h3 className="text-xl font-semibold">{title||t('common.empty')}</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t('common.emptyHint')}</p>{children&&<div className="mt-5">{children}</div>}</div>}
