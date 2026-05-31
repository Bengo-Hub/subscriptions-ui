'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
} from '@/components/ui/base';
import { useAuthStore } from '@/store/auth';
import { useConfigs, useCreateConfig, useDeleteConfig, useUpdateConfig } from '@/hooks/useConfigs';
import type { ServiceConfig, ServiceConfigCreateRequest } from '@/types/config';
import { Eye, EyeOff, Loader2, Plus, Settings, Trash2, X } from 'lucide-react';
import { useState } from 'react';

const emptyForm: ServiceConfigCreateRequest = {
  configKey: '',
  configValue: '',
  configType: 'string',
  description: '',
  isSecret: false,
};

function ValueChip({ value, type, secret, revealed }: { value: string; type: string; secret: boolean; revealed: boolean }) {
  const display = secret && !revealed ? '••••••••' : value;

  if (type === 'boolean' || type === 'bool') {
    const isTrue = value === 'true' || value === '1';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${isTrue ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
        {display}
      </span>
    );
  }
  if (type === 'number' || type === 'int') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
        {display}
      </span>
    );
  }
  if (type === 'json') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 max-w-[200px] truncate">
        {display}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-accent text-foreground max-w-[200px] truncate">
      {display}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  const map: Record<string, string> = {
    boolean: 'BOOL',
    bool: 'BOOL',
    number: 'INT',
    int: 'INT',
    json: 'JSON',
    string: 'STR',
  };
  return (
    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 border border-border rounded px-1.5 py-0.5">
      {map[type] ?? type.toUpperCase()}
    </span>
  );
}

function KeyDisplay({ configKey }: { configKey: string }) {
  const dotIdx = configKey.indexOf('.');
  if (dotIdx === -1) {
    return <code className="text-sm font-mono font-semibold">{configKey}</code>;
  }
  const ns = configKey.slice(0, dotIdx + 1);
  const rest = configKey.slice(dotIdx + 1);
  return (
    <code className="text-sm font-mono">
      <span className="text-muted-foreground/50">{ns}</span>
      <span className="font-semibold">{rest}</span>
    </code>
  );
}

export default function ConfigsPage() {
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceConfigCreateRequest>(emptyForm);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const { data, isLoading } = useConfigs();
  const createMutation = useCreateConfig();
  const updateMutation = useUpdateConfig();
  const deleteMutation = useDeleteConfig();

  const configs = data?.data ?? [];

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c: ServiceConfig) => {
    setEditingId(c.id);
    setForm({ configKey: c.configKey, configValue: c.configValue, configType: c.configType, description: c.description, isSecret: c.isSecret });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, req: { configValue: form.configValue, configType: form.configType, description: form.description, isSecret: form.isSecret } }, { onSuccess: closeForm });
    } else {
      createMutation.mutate(form, { onSuccess: closeForm });
    }
  };

  const busy = createMutation.isPending || updateMutation.isPending;
  const toggleReveal = (id: string) => setRevealed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (!isPlatformOwner) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Configuration</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform-level configuration keys. Secret values are masked.</p>
        </div>
        <Button onClick={openCreate} className="h-10 px-5 rounded-xl font-semibold">
          <Plus className="h-4 w-4 mr-2" /> Add Config
        </Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <Card className="border-primary/20 rounded-2xl shadow-lg">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingId ? 'Edit Config' : 'New Config'}</h2>
              <Button variant="ghost" size="icon" onClick={closeForm} className="rounded-full"><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key</label>
                <Input value={form.configKey} onChange={(e) => setForm((p) => ({ ...p, configKey: e.target.value }))} placeholder="e.g. subscriptions.max_plans_per_tenant" className="h-11 rounded-xl font-mono" disabled={!!editingId} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Value</label>
                <Input type={form.isSecret ? 'password' : 'text'} value={form.configValue} onChange={(e) => setForm((p) => ({ ...p, configValue: e.target.value }))} placeholder="Config value" className="h-11 rounded-xl" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</label>
                <select value={form.configType ?? 'string'} onChange={(e) => setForm((p) => ({ ...p, configType: e.target.value }))} className="flex h-11 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium">
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                <Input value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What does this config do?" className="h-11 rounded-xl" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isSecret ?? false} onChange={(e) => setForm((p) => ({ ...p, isSecret: e.target.checked }))} className="h-4 w-4 rounded" />
              <span className="text-sm font-medium">Secret (masked in UI)</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closeForm} className="rounded-xl">Cancel</Button>
              <Button onClick={handleSubmit} disabled={busy || !form.configKey || !form.configValue} className="rounded-xl h-10 px-6 font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config list */}
      <Card className="rounded-2xl border border-border overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Configuration Keys</h2>
            {data && <span className="text-sm text-muted-foreground ml-auto">{data.total} keys</span>}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : configs.length ? (
            <div className="divide-y divide-border">
              {configs.map((c) => (
                <div
                  key={c.id}
                  className="group flex items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors"
                >
                  {/* Key + description */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <KeyDisplay configKey={c.configKey} />
                    {c.description && (
                      <p className="text-xs text-muted-foreground truncate">{c.description}</p>
                    )}
                  </div>

                  {/* Value + type */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <ValueChip
                        value={c.configValue}
                        type={c.configType}
                        secret={c.isSecret}
                        revealed={revealed.has(c.id)}
                      />
                      {c.isSecret && (
                        <button
                          onClick={() => toggleReveal(c.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {revealed.has(c.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                    <TypePill type={c.configType} />
                  </div>

                  {/* Actions — visible on row hover */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(c)}
                      className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500"
                      title="Edit"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { if (confirm(`Delete config "${c.configKey}"?`)) deleteMutation.mutate(c.id); }}
                      className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">No configuration keys found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
