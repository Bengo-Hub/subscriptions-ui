import { describe, expect, it, vi } from 'vitest';

// format.ts takes formatCurrency from the shared UI library; a plain stand-in keeps this a node test.
vi.mock('@bengo-hub/shared-ui-lib', () => ({
  formatCurrency: (n: number, c: string) => `${c} ${n.toLocaleString('en-KE')}`,
}));

import type { SubscriptionAddOn } from '@/types/subscription';
import type { InvoicePreview } from '@/types/billing';
import { fmtDate } from './format';
import {
  addOnPriceLabel,
  addOnRenewalNote,
  addOnRuleNote,
  billableAddOns,
  breakdownLines,
  canRemoveAddOn,
  nextBillTotal,
  parseAddPlanResult,
  serviceLabel,
  subscriptionAddOns,
} from './addons';

function addOn(over: Partial<SubscriptionAddOn> = {}): SubscriptionAddOn {
  return {
    product_code: 'marketflow', plan_code: 'MARKETFLOW_GROWTH', plan_name: 'MarketFlow Growth', service_tag: 'marketflow',
    status: 'active', price: 1500, currency: 'KES', billing_cycle: 'MONTHLY',
    trial_ends_at: null, current_period_end: '2026-12-27T00:00:00Z', activated_at: '2026-11-27T00:00:00Z', ...over,
  };
}

const preview = (over: Partial<InvoicePreview> = {}): InvoicePreview => ({
  base_plan_price_kes: 6000, currency: 'KES', overage_charges: [], overage_total_kes: 0, custom_addons: [], addons_total_kes: 0,
  credits_available_kes: 0, credits_to_apply_kes: 0, estimated_total_kes: 6000, ...over,
});

describe('add-ons card', () => {
  it('reads a missing add_ons list (older API) as none', () => {
    expect(subscriptionAddOns({})).toEqual([]);
    expect(subscriptionAddOns(null)).toEqual([]);
    expect(subscriptionAddOns({ add_ons: [addOn()] })).toHaveLength(1);
  });

  it('shows the price per cycle, or Free', () => {
    expect(addOnPriceLabel(addOn())).toBe('KES 1,500 a month');
    expect(addOnPriceLabel(addOn({ price: 0 }))).toBe('Free');
    expect(addOnPriceLabel(addOn({ billing_cycle: 'ANNUAL', price: 15000 }))).toBe('KES 15,000 a year');
  });

  it('says when it renews, or until when it is free', () => {
    expect(addOnRenewalNote(addOn())).toBe(`Renews with your plan on ${fmtDate('2026-12-27T00:00:00Z')}`);
    expect(addOnRenewalNote(addOn({ status: 'trial', trial_ends_at: '2026-12-10T00:00:00Z' }))).toBe(
      `Free until your trial ends on ${fmtDate('2026-12-10T00:00:00Z')}`,
    );
    expect(addOnRenewalNote(addOn({ status: 'trial' }), '2026-12-05T00:00:00Z')).toContain(fmtDate('2026-12-05T00:00:00Z'));
  });

  it('offers removal only for an add-on that is on and not already ending', () => {
    expect(canRemoveAddOn(addOn())).toBe(true);
    expect(canRemoveAddOn(addOn({ status: 'inactive' }))).toBe(false);
    expect(canRemoveAddOn(addOn({ cancel_at_period_end: true }))).toBe(false);
  });

  it('names PowerSuite for the pos service tag', () => {
    expect(serviceLabel('pos')).toBe('PowerSuite');
    expect(serviceLabel('marketflow')).toBe('MarketFlow');
  });
});

describe('next bill with add-ons', () => {
  const list = [addOn(), addOn({ product_code: 'free', price: 0 }), addOn({ product_code: 'gone', status: 'inactive' })];

  it('lists only paid add-ons that are on', () => {
    expect(billableAddOns(list).map((a) => a.product_code)).toEqual(['marketflow']);
  });

  it('adds them to an estimate that has no add-on figure, and trusts one that has', () => {
    expect(nextBillTotal(preview(), list)).toBe(7500);
    expect(nextBillTotal(preview({ plan_addons_total_kes: 1500, estimated_total_kes: 7500 }), list)).toBe(7500);
    expect(nextBillTotal(undefined, list)).toBeUndefined();
  });
});

describe('Add to my plan', () => {
  it('states the rule before purchase without working out an amount', () => {
    const note = addOnRuleNote({ basePrice: 1500 }, { status: 'ACTIVE', current_period_end: '2026-12-27T00:00:00Z' });
    expect(note).toContain(fmtDate('2026-12-27T00:00:00Z'));
    expect(note).toContain('exact amount before you pay');
    expect(addOnRuleNote({ basePrice: 1500 }, { status: 'TRIAL', trial_ends_at: '2026-12-10T00:00:00Z' })).toMatch(/^Free until your trial ends/);
    expect(addOnRuleNote({ basePrice: 0 }, { status: 'ACTIVE' })).toMatch(/^Free/);
  });

  it('reads a partial charge breakdown and a payment intent from the API answer', () => {
    const r = parseAddPlanResult({
      intent_id: 'pi_1', initiate_url: 'https://pay', amount: '450',
      breakdown: { full_price: 1500, covered_amount: 900, charged_amount: 450, prorated_to: '2026-12-27T00:00:00Z' },
    });
    expect(r.outcome).toBe('add_on');
    expect(r.payment).toEqual({ kind: 'intent', intentId: 'pi_1', initiateUrl: 'https://pay', amount: 450 });
    expect(breakdownLines(r.breakdown!).map((l) => l.value)).toEqual(['KES 1,500', '−KES 900', 'KES 450']);
  });

  it('recognises a plan that became the main plan, and an answer with nothing to pay', () => {
    expect(parseAddPlanResult({ outcome: 'main_plan', invoice_id: 'inv_1', amount_due: 2000 })).toMatchObject({
      outcome: 'main_plan',
      payment: { kind: 'invoice', amount: 2000 },
    });
    expect(parseAddPlanResult({ id: 'sub', plan_code: 'TREASURY_GROWTH' })).toEqual({ outcome: 'add_on', breakdown: undefined, payment: { kind: 'none' } });
  });
});
