import { describe, expect, it } from 'vitest';
import { intentPlansHref, readServiceIntent } from './service-intent';

// Every app links to /billing with its service (owner, 2026-11-28); the page reads it safely.
describe('billing service intent', () => {
  it('reads the service and plan an app sent', () => {
    expect(readServiceIntent('?service=marketflow&plan=MARKETFLOW_GROWTH')).toEqual({ service: 'marketflow', plan: 'MARKETFLOW_GROWTH' });
    expect(readServiceIntent('service=ERP')).toEqual({ service: 'erp', plan: undefined });
  });

  it('ignores anything that is not a plain tag or plan code', () => {
    expect(readServiceIntent('')).toBeNull();
    expect(readServiceIntent('?service=<script>')).toBeNull();
    expect(readServiceIntent('?service=pos&plan=a b')).toEqual({ service: 'pos', plan: undefined });
  });

  it('hands over to the plans page filtered to the service', () => {
    expect(intentPlansHref({ service: 'marketflow', plan: 'X1' })).toBe('/plans?service=marketflow&plan=X1');
    expect(intentPlansHref({ service: 'afya' })).toBe('/plans?service=afya');
  });
});
