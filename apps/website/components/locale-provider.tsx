'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { Locale } from '@/lib/i18n/config'

/** The few labels client components need, so pages never pass them down. */
export interface LocaleUi {
  copy: string
  copied: string
  copyCommand: string
  copyCode: string
  menu: string
  closeMenu: string
  language: string
  primaryNavigation: string
}

interface LocaleContextValue {
  locale: Locale
  ui: LocaleUi
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function LocaleProvider({ value, children }: { value: LocaleContextValue; children: ReactNode }) {
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale() needs a <LocaleProvider> above it.')

  return value
}
