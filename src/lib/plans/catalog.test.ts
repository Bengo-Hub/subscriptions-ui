import { describe, expect, it } from 'vitest';
import { planGroup, planTierLabel, plansForTenant, sortGroups, type Plan } from './catalog';

function plan(code: string, over: Partial<Plan> = {}): Plan {
  return {
    id: code, planCode: code, name: code, description: '', billingCycle: 'MONTHLY', basePrice: 1000, currency: 'KES',
    isActive: true, isPublic: true, tierOrder: 1, tierLimits: {}, freeTrialDays: 0, discountRules: [], ...over,
  };
}

describe('planGroup and labels', () => {
  it('groups by the first code segment, with legacy bare tiers as Ordering', () => {
    expect(planGroup('POWERSUITE_DUKA_PRO')).toBe('POWERSUITE');
    expect(planGroup('GROWTH')).toBe('ORDERING');
    expect(planGroup('STARTER_YEARLY')).toBe('ORDERING');
    expect(planGroup(undefined)).toBe('OTHER');
  });
  it('labels a tier without its group prefix', () => {
    expect(planTierLabel('POWERSUITE_DUKA_PRO', 'POWERSUITE')).toBe('Duka Pro');
    expect(planTierLabel('POS_SUITE_STANDARD', 'POS')).toBe('Standard');
  });
  it('orders known groups first, unknown ones alphabetically after', () => {
    expect(sortGroups(['ZETA', 'POS', 'ALPHA', 'POWERSUITE'])).toEqual(['POWERSUITE', 'POS', 'ALPHA', 'ZETA']);
  });
});

describe('plansForTenant', () => {
  const all = [
    plan('POWERSUITE_DUKA_PRO', { useCase: 'retail', tierOrder: 2 }),
    plan('POWERSUITE_DUKA_BASIC', { useCase: 'retail', tierOrder: 1 }),
    plan('POWERSUITE_HOSP_BASIC', { useCase: 'hospitality', tierOrder: 1 }),
    plan('POWERSUITE_DUKA_PRO_YEARLY', { useCase: 'retail', billingCycle: 'ANNUAL', tierOrder: 2 }),
    plan('POWERSUITE_DUKA_LICENSE', { useCase: 'retail', billingCycle: 'ONE_TIME', tierOrder: 3 }),
    plan('SUPPORT_POWERSUITE_PRO', { isPublic: false }),
  ];

  it('shows a retail tenant only retail subscription plans, cheapest tier first', () => {
    expect(plansForTenant(all, 'POWERSUITE', 'RECURRING', 'retail').map((p) => p.planCode)).toEqual([
      'POWERSUITE_DUKA_BASIC',
      'POWERSUITE_DUKA_PRO',
    ]);
  });

  it('keeps the tenant current plan visible even if it is for another vertical', () => {
    const codes = plansForTenant(all, 'POWERSUITE', 'RECURRING', 'retail', 'POWERSUITE_HOSP_BASIC').map((p) => p.planCode);
    expect(codes).toContain('POWERSUITE_HOSP_BASIC');
  });

  it('lists one-time licences separately and never the retired yearly rows', () => {
    expect(plansForTenant(all, 'POWERSUITE', 'ONE_TIME', 'retail').map((p) => p.planCode)).toEqual(['POWERSUITE_DUKA_LICENSE']);
    expect(plansForTenant(all, 'POWERSUITE', 'RECURRING', 'other').map((p) => p.planCode)).not.toContain('POWERSUITE_DUKA_PRO_YEARLY');
  });

  it('never shows non-public plans', () => {
    expect(plansForTenant(all, 'SUPPORT', 'RECURRING', 'other')).toEqual([]);
  });
});
