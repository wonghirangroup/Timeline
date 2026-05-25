// admin/src/stores/planConfigStore.ts
import { create } from 'zustand'
import { MOCK_PLAN_CONFIGS } from '../lib/mock'
import type { PlanConfig, PlanFeatures, PlanLimits, TenantPlan } from '../types'

interface PlanConfigState {
  configs: PlanConfig[]
  updateFeature: (plan: TenantPlan, key: keyof PlanFeatures, val: boolean) => void
  updateLimit:   (plan: TenantPlan, key: keyof PlanLimits, val: number) => void
  updatePrice:   (plan: TenantPlan, val: number) => void
  getFeatures:   (plan: TenantPlan) => PlanFeatures
}

export const usePlanConfigStore = create<PlanConfigState>((set, get) => ({
  configs: MOCK_PLAN_CONFIGS,

  updateFeature: (plan, key, val) =>
    set(s => ({
      configs: s.configs.map(c =>
        c.plan === plan ? { ...c, features: { ...c.features, [key]: val } } : c
      ),
    })),

  updateLimit: (plan, key, val) =>
    set(s => ({
      configs: s.configs.map(c =>
        c.plan === plan ? { ...c, limits: { ...c.limits, [key]: val } } : c
      ),
    })),

  updatePrice: (plan, val) =>
    set(s => ({
      configs: s.configs.map(c =>
        c.plan === plan ? { ...c, price_monthly: val } : c
      ),
    })),

  getFeatures: (plan) => {
    const cfg = get().configs.find(c => c.plan === plan)
    return cfg?.features ?? MOCK_PLAN_CONFIGS[0].features
  },
}))
