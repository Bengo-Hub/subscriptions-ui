import { describe, expect, it } from 'vitest';
import { intentNextHref, readServiceIntent } from './service-intent';

// Every app links to /billing with its service or plan (owner, 2026-11-28); the page reads it safely.
describe('billing service intent', () => {
  it('reads the service and plan an app sent, alone or together', () => {
    expect(readServiceIntent('?service=marketflow&plan=MARKETFLOW_GROWTH')).toEqual({ service: 'marketflow', plan: 'MARKETFLOW_GROWTH' });
    expect(readServiceIntent('service=ERP')).toEqual({ service: 'erp', plan: undefined });
    expect(readServiceIntent('?plan=erp_starter')).toEqual({ service: undefined, plan: 'erp_starter' });
  });

  it('ignores anything that is not a plain tag or plan code', () => {
    expect(readServiceIntent('')).toBeNull();
    expect(readServiceIntent('?service=<script>')).toBeNull();
    expect(readServiceIntent('?service=pos&plan=a b')).toEqual({ service: 'pos', plan: undefined });
  });

  it('opens a named plan checkout, or the plans page filtered to the service', () => {
    expect(intentNextHref({ plan: 'X1' }, false)).toBe('/subscribe?plan=X1');
    expect(intentNextHref({ service: 'marketflow', plan: 'X1' }, true)).toBe('/plans?service=marketflow&plan=X1');
    expect(intentNextHref({ service: 'afya' }, false)).toBe('/plans?service=afya');
  });
});
