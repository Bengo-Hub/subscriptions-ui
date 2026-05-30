'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Configuration</h1>
          <p className="text-muted-foreground mt-1 text-sm">Platform-level configuration keys. Secret values are masked.</p>
        </div>
        <Button onClick={openCreate} className="h-10 px-5 rounded-xl font-semibold">
          <Plus className="h-4 w-4 mr-2" /> Add Config
        </Button>
      </div>

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
                <Input value={form.configKey} onChange={(e) => setForm((p) => ({ ...p, configKey: e.target.value }))} placeholder="e.g. max_tenants_per_plan" className="h-11 rounded-xl font-mono" disabled={!!editingId} />
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
            <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}</div>
          ) : configs.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24 text-right pr-6">{''}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell><code className="text-xs bg-accent px-2 py-0.5 rounded font-mono">{c.configKey}</code></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-xs">
                        {c.isSecret ? (
                          <>
                            <span className="font-mono text-sm flex-1 truncate">{revealed.has(c.id) ? c.configValue : '••••••••'}</span>
                            <button onClick={() => toggleReveal(c.id)} className="text-muted-foreground hover:text-foreground">
                              {revealed.has(c.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </>
                        ) : (
                          <span className="font-mono text-sm truncate">{c.configValue}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-semibold uppercase">{c.configType}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{c.description ?? '—'}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)} className="h-8 w-8 rounded-lg hover:bg-blue-500/10 hover:text-blue-500">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { if (confirm(`Delete config "${c.configKey}"?`)) deleteMutation.mutate(c.id); }}
                          className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-muted-foreground text-sm">No configuration keys found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
