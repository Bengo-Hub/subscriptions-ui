import { describe, expect, it } from 'vitest';
import { planAction, planCoveredBy, planGroup, planTierLabel, plansForTenant, previousTier, sortGroups, visibleGroups, type Plan } from './catalog';

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

  // 27 November 2026: Hadia (use_case gift_registry) saw "No plans available here yet" on the
  // PowerSuite tab, because every PowerSuite plan carries a vertical (retail, hospitality,
  // pharmacy, all service_tag "pos") and none matched.
  it('shows every PowerSuite family to a tenant whose vertical has none, grouped by family', () => {
    const codes = plansForTenant(all, 'POWERSUITE', 'RECURRING', 'gift_registry').map((p) => p.planCode);
    expect(codes).toEqual(['POWERSUITE_HOSP_BASIC', 'POWERSUITE_DUKA_BASIC', 'POWERSUITE_DUKA_PRO']);
    expect(plansForTenant(all, 'POWERSUITE', 'RECURRING', 'services').length).toBe(3);
  });

  it('compares a card only with the previous tier of its own family', () => {
    const plans = plansForTenant(all, 'POWERSUITE', 'RECURRING', 'gift_registry');
    expect(previousTier(plans, 1)).toBeUndefined();
    expect(previousTier(plans, 2)?.planCode).toBe('POWERSUITE_DUKA_BASIC');
  });
});

describe('planAction (CTA wording)', () => {
  const treasury = plan('TREASURY_GROWTH', { serviceTag: 'treasury', tierOrder: 2 });
  const base = { currentCode: 'TREASURY_GROWTH', currentPlan: treasury, status: 'ACTIVE', hasSubscription: true };

  it('offers another service as an add-on to a running plan', () => {
    expect(planAction(plan('MARKETFLOW_STARTER', { serviceTag: 'marketflow' }), base)).toBe('add_on');
    expect(planAction(plan('POWERSUITE_DUKA_BASIC', { serviceTag: 'pos' }), { ...base, status: 'TRIAL' })).toBe('add_on');
  });

  it('keeps the plan-change wording for the same service', () => {
    expect(planAction(plan('TREASURY_PROFESSIONAL', { serviceTag: 'treasury', tierOrder: 3 }), base)).toBe('upgrade');
    expect(planAction(plan('TREASURY_STARTER', { serviceTag: 'treasury', tierOrder: 1 }), base)).toBe('downgrade');
    expect(planAction(treasury, base)).toBe('current');
  });

  it('marks an attached add-on and falls back to subscribe without a running plan', () => {
    const mf = plan('MARKETFLOW_STARTER', { serviceTag: 'marketflow' });
    const addOns = [{ product_code: 'marketflow', plan_code: 'MARKETFLOW_STARTER', plan_name: 'MarketFlow Starter', service_tag: 'marketflow', status: 'active' as const, price: 0, currency: 'KES', billing_cycle: 'MONTHLY' }];
    expect(planAction(mf, { ...base, addOns })).toBe('added');
    expect(planAction(mf, { ...base, status: 'EXPIRED' })).toBe('subscribe');
    expect(planAction(mf, { currentCode: null, status: null, hasSubscription: false })).toBe('subscribe');
    expect(planAction(plan('MARKETFLOW_LICENSE', { serviceTag: 'marketflow', billingCycle: 'ONE_TIME' }), base)).toBe('subscribe');
  });
});

describe('visibleGroups', () => {
  const groups = ['POS', 'MARKETFLOW', 'ORDERING', 'POS'];

  it('shows only the linked app when the link asks for it, whatever the use case', () => {
    expect(visibleGroups(groups, { allowed: ['POS'], linked: 'MARKETFLOW', only: true })).toEqual(['MARKETFLOW']);
  });

  it('keeps every relevant tab without only=1, and falls back when the linked group has no plans', () => {
    expect(visibleGroups(groups, { allowed: ['POS', 'ORDERING'], linked: 'MARKETFLOW' })).toEqual(['ORDERING', 'POS']);
    expect(visibleGroups(groups, { linked: 'AFYA', only: true })).toEqual(['ORDERING', 'POS', 'MARKETFLOW']);
  });

  it('keeps the subscribed group visible outside the use case', () => {
    expect(visibleGroups(groups, { allowed: ['POS'], subscribed: 'MARKETFLOW' })).toEqual(['POS', 'MARKETFLOW']);
  });
});

// A plan the tenant's main plan (and add-ons) already includes is shown as "Already in your plan",
// not "Add to my plan" (owner, 2026-11-28: MarketFlow Starter bundled in Treasury Growth).
describe('planCoveredBy and the covered action', () => {
  const f = (codes: string[]) => codes.map((featureCode) => ({ featureCode, isIncluded: true, overageUnitPrice: 0 }));
  const treasury = plan('TREASURY_GROWTH', { serviceTag: 'treasury', features: f(['payouts', 'mf_profile', 'mf_leads']), tierLimits: { crm_contacts: 200, campaigns: 1 } });
  const starter = plan('MARKETFLOW_STARTER', { serviceTag: 'marketflow', features: f(['mf_profile', 'mf_leads']), tierLimits: { crm_contacts: 200, campaigns: 1 } });
  const lite = plan('MARKETFLOW_LITE', { serviceTag: 'marketflow', tierOrder: 2, features: f(['mf_profile', 'mf_leads', 'mf_funnels']), tierLimits: { crm_contacts: 2000, campaigns: 3 } });
  const ctx = { currentCode: 'TREASURY_GROWTH', currentPlan: treasury, status: 'ACTIVE', hasSubscription: true };

  it('covers a plan whose features and limits the main plan already has', () => {
    expect(planCoveredBy(starter, [treasury])).toBe(true);
    expect(planAction(starter, ctx)).toBe('covered');
  });

  it('still offers a plan with more features or higher limits', () => {
    expect(planCoveredBy(lite, [treasury])).toBe(false);
    expect(planAction(lite, ctx)).toBe('add_on');
  });

  it('counts add-ons, treats unlimited as the most, and never covers an empty plan', () => {
    expect(planCoveredBy(starter, [treasury, lite])).toBe(true);
    const unlimited = plan('X', { features: f(['payouts']), tierLimits: { crm_contacts: -1 } });
    expect(planCoveredBy(plan('Y', { features: f(['payouts']), tierLimits: { crm_contacts: 5000 } }), [unlimited])).toBe(true);
    expect(planCoveredBy(plan('EMPTY'), [treasury])).toBe(false);
  });
});
