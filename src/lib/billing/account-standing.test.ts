import { describe, expect, it } from 'vitest';
import type { BillingInfo } from '@/types/billing';
import { accountStanding, invoiceAmountDue, openBills, payTargetFor } from './account-standing';

const NOW = new Date('2026-10-05T12:00:00Z');

// The real case behind the redesign: alpha-china-market, INV-260928-000030 for KES 3,000 open,
// period ending 5 Oct, subscription pay link in metadata.
const PAY_URL =
  'https://books.codevertexafrica.com/pay?amount=3000.00&currency=KES&intent_id=cba6d4d5-1962-4ea9-a624-46d2e026d31a' +
  '&invoice_number=INV-260928-000030&reference_id=SUB-D78B1A-43A846E71841&reference_type=subscription' +
  '&tenant=d78b1af7-bdb2-48d7-849e-64859cf3bb8e';

function billing(over: Partial<BillingInfo> = {}): BillingInfo {
  return {
    hasSubscription: true,
    status: 'ACTIVE',
    planName: 'PowerSuite Retail (Duka) Basic',
    currency: 'KES',
    billingMode: 'recurring',
    currentPeriodEnd: '2026-11-05T16:25:36Z',
    invoices: [],
    ...over,
  };
}

describe('invoiceAmountDue', () => {
  it('is the unpaid part of a partly paid invoice', () => {
    expect(invoiceAmountDue({ id: 'a', date: '', amount: 3000, amountPaid: 1000, currency: 'KES', status: 'partial', description: '' })).toBe(2000);
  });
  it('is zero for paid and void invoices whatever amountPaid says', () => {
    expect(invoiceAmountDue({ id: 'a', date: '', amount: 3000, currency: 'KES', status: 'paid', description: '' })).toBe(0);
    expect(invoiceAmountDue({ id: 'a', date: '', amount: 3000, currency: 'KES', status: 'void', description: '' })).toBe(0);
  });
  it('never goes negative on an overpayment', () => {
    expect(invoiceAmountDue({ id: 'a', date: '', amount: 3000, amountPaid: 3500, currency: 'KES', status: 'pending', description: '' })).toBe(0);
  });
});

describe('accountStanding', () => {
  it('leads with the open invoice when one is owed (the alpha-china-market case)', () => {
    const s = accountStanding(
      billing({
        currentPeriodEnd: '2026-10-05T09:15:00Z',
        invoices: [{ id: 'INV-260928-000030', date: '2026-09-28T09:55:48Z', amount: 3000, currency: 'KES', status: 'pending', description: '', payUrl: PAY_URL }],
      }),
      NOW,
    );
    expect(s.kind).toBe('owes');
    expect(s.totalDue).toBe(3000);
    expect(s.bills[0].payUrl).toBe(PAY_URL);
  });

  it('adds issued support charges to what is owed, but not ones with no invoice yet', () => {
    const s = accountStanding(
      billing({
        supportCharges: [
          { id: 's1', name: 'Hosting', periodStart: '', dueDate: '2026-10-01', graceEndsAt: '', status: 'OVERDUE', amount: 1500, currency: 'KES', blocking: false, payUrl: 'https://books.codevertexafrica.com/i/tok' },
          { id: 's2', name: 'Hosting', periodStart: '', dueDate: '2026-11-01', graceEndsAt: '', status: 'PENDING', amount: 1500, currency: 'KES', blocking: false },
        ],
      }),
      NOW,
    );
    expect(s.kind).toBe('owes');
    expect(s.bills).toHaveLength(1);
    expect(s.bills[0].overdue).toBe(true);
    expect(s.totalDue).toBe(1500);
  });

  // boi-enterprises, 2026-10-08: a fully paid perpetual licence plus one open support invoice
  // showed two KES 3,000 bills, the support invoice repeated under the plan's name.
  it('lists a support invoice once, as its support charge, never as a subscription bill', () => {
    const supportInvoice = { id: 'INV-261008-000032', date: '2026-10-08', amount: 3000, currency: 'KES', status: 'pending', description: '' };
    const charge = {
      id: 's1', name: 'Dedicated Support Engineer', periodStart: '', dueDate: '2026-10-15', graceEndsAt: '',
      status: 'INVOICED' as const, amount: 3000, currency: 'KES', blocking: false, invoiceNumber: 'INV-261008-000032',
      payUrl: 'https://books.codevertexafrica.com/i/tok',
    };
    const perpetual = { isPerpetual: true, billingMode: 'one_time' as const, planName: 'PowerSuite Retail (Duka) Gold Perpetual License' };
    // Before treasury tags the invoice's kind: matched by number.
    const untagged = accountStanding(billing({ ...perpetual, invoices: [supportInvoice], supportCharges: [charge] }), NOW);
    expect(untagged.bills).toHaveLength(1);
    expect(untagged.bills[0]).toMatchObject({ kind: 'support', label: 'Dedicated Support Engineer' });
    expect(untagged.totalDue).toBe(3000);
    // Tagged support invoice whose charge is not listed: still not a subscription bill.
    const tagged = accountStanding(billing({ ...perpetual, invoices: [{ ...supportInvoice, kind: 'support' }] }), NOW);
    expect(tagged.kind).toBe('perpetual');
  });

  it('does not call an issued, unpaid invoice overdue just because its issue date is past', () => {
    const bills = openBills(billing({ invoices: [{ id: 'X', date: '2026-09-28', amount: 3000, currency: 'KES', status: 'pending', description: '' }] }));
    expect(bills[0].overdue).toBe(false);
  });

  it('is paid up when nothing is owed and renewal is more than a week away', () => {
    const s = accountStanding(billing({ invoices: [{ id: 'X', date: '', amount: 3000, currency: 'KES', status: 'paid', description: '' }] }), NOW);
    expect(s.kind).toBe('paid');
    expect(s.daysLeft).toBe(32);
  });

  it('asks to renew inside the last week, and after the period has passed', () => {
    expect(accountStanding(billing({ currentPeriodEnd: '2026-10-10T12:00:00Z' }), NOW).kind).toBe('renew_due');
    const lapsed = accountStanding(billing({ currentPeriodEnd: '2026-10-01T12:00:00Z' }), NOW);
    expect(lapsed.kind).toBe('renew_due');
    expect(lapsed.daysLeft).toBeLessThan(0);
  });

  it('treats a suspended account with nothing invoiced as needing renewal to restore', () => {
    expect(accountStanding(billing({ status: 'SUSPENDED' }), NOW).kind).toBe('suspended');
  });

  it('respects a scheduled cancellation and a perpetual licence', () => {
    expect(accountStanding(billing({ cancelAtPeriodEnd: true, currentPeriodEnd: '2026-10-07T00:00:00Z' }), NOW).kind).toBe('cancelling');
    expect(accountStanding(billing({ isPerpetual: true, billingMode: 'one_time' }), NOW).kind).toBe('perpetual');
  });

  it('never asks a pay-as-you-go tenant to renew', () => {
    expect(accountStanding(billing({ billingMode: 'service_charge', currentPeriodEnd: '2026-10-06T00:00:00Z' }), NOW).kind).toBe('paid');
  });

  it('is none without a subscription', () => {
    expect(accountStanding({ hasSubscription: false, invoices: [] }, NOW).kind).toBe('none');
    expect(accountStanding(undefined, NOW).kind).toBe('none');
  });
});

describe('payTargetFor', () => {
  it('opens a subscription invoice pay link in the in-app checkout', () => {
    expect(payTargetFor(PAY_URL, 0)).toEqual({
      mode: 'modal',
      intentId: 'cba6d4d5-1962-4ea9-a624-46d2e026d31a',
      tenant: 'd78b1af7-bdb2-48d7-849e-64859cf3bb8e',
      amount: 3000,
      currency: 'KES',
      referenceId: 'SUB-D78B1A-43A846E71841',
      referenceType: 'subscription',
    });
  });

  it('sends a public invoice page to a new tab', () => {
    expect(payTargetFor('https://books.codevertexafrica.com/i/abc123', 1500)).toEqual({ mode: 'link', href: 'https://books.codevertexafrica.com/i/abc123' });
  });

  it('uses the bill amount when the link has none, and rejects junk', () => {
    const t = payTargetFor('https://books.codevertexafrica.com/pay?intent_id=i&tenant=t', 750);
    expect(t).toMatchObject({ mode: 'modal', amount: 750 });
    expect(payTargetFor('not a url', 1)).toBeNull();
    expect(payTargetFor(undefined, 1)).toBeNull();
  });
});
