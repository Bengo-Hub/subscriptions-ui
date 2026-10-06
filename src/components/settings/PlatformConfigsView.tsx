'use client';

import { useState } from 'react';
import { Database, Plus, Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge, Button, Input } from '@/components/ui/base';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionCard } from '@/components/ui/page-header';
import { apiClient } from '@/lib/api/client';

export interface ServiceConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description: string;
  isSecret: boolean;
  updatedAt: string;
}

export const SERVICE_CONFIGS_KEY = ['admin-service-configs'] as const;

export function useServiceConfigs() {
  return useQuery({
    queryKey: SERVICE_CONFIGS_KEY,
    queryFn: () => apiClient.get<{ data: ServiceConfig[]; total: number }>('/api/v1/admin/configs'),
    staleTime: 60_000,
  });
}

const TYPES = ['string', 'int', 'bool', 'float', 'json'];
const EMPTY = { configKey: '', configValue: '', configType: 'string', description: '', isSecret: false };
const selectClass = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

/** Platform-level service configs (platform owners only). */
export function PlatformConfigsView() {
  const qc = useQueryClient();
  const { data, isLoading } = useServiceConfigs();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceConfig>>({});
  const [newForm, setNewForm] = useState(EMPTY);
  const [showNew, setShowNew] = useState(false);
  const [deleting, setDeleting] = useState<ServiceConfig | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: SERVICE_CONFIGS_KEY });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ServiceConfig> }) => apiClient.put(`/api/v1/admin/configs/${id}`, body),
    onSuccess: () => {
      refresh();
      toast.success('Config updated');
      setEditingId(null);
      setEditForm({});
    },
    onError: () => toast.error('Failed to update config'),
  });
  const create = useMutation({
    mutationFn: (body: typeof EMPTY) => apiClient.post('/api/v1/admin/configs', body),
    onSuccess: () => {
      refresh();
      toast.success('Config created');
      setShowNew(false);
      setNewForm(EMPTY);
    },
    onError: () => toast.error('Failed to create config'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/configs/${id}`),
    onSuccess: () => {
      refresh();
      toast.success('Config deleted');
    },
    onError: () => toast.error('Failed to delete config'),
  });

  const grouped = (data?.data ?? []).reduce<Record<string, ServiceConfig[]>>((acc, c) => {
    const prefix = c.configKey.includes('.') ? c.configKey.split('.')[0] : 'general';
    (acc[prefix] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Platform-level settings read by the subscriptions service.</p>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4" aria-hidden /> Add config
        </Button>
      </div>

      {showNew && (
        <SectionCard title="New config" icon={Plus}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Key" htmlFor="new-key">
                <Input id="new-key" placeholder="subscriptions.my_setting" value={newForm.configKey} onChange={(e) => setNewForm((p) => ({ ...p, configKey: e.target.value }))} />
              </Field>
              <Field label="Type" htmlFor="new-type">
                <select id="new-type" className={selectClass} value={newForm.configType} onChange={(e) => setNewForm((p) => ({ ...p, configType: e.target.value }))}>
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Value" htmlFor="new-value">
              <Input id="new-value" value={newForm.configValue} onChange={(e) => setNewForm((p) => ({ ...p, configValue: e.target.value }))} />
            </Field>
            <Field label="Description" htmlFor="new-desc">
              <Input id="new-desc" placeholder="What does this config do?" value={newForm.description} onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="h-4 w-4 accent-primary" checked={newForm.isSecret} onChange={(e) => setNewForm((p) => ({ ...p, isSecret: e.target.checked }))} />
              Secret (mask the value in the UI)
            </label>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => create.mutate(newForm)} disabled={create.isPending || !newForm.configKey || !newForm.configValue}>
                {create.isPending ? 'Creating…' : 'Create'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SectionCard>
      )}

      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)
        : Object.entries(grouped).map(([group, items]) => (
            <SectionCard key={group} title={group} icon={Database} action={<Badge variant="outline">{items.length}</Badge>} bodyClassName="p-0 sm:p-0">
              <ul className="divide-y divide-border">
                {items.map((c) => (
                  <li key={c.id} className="px-4 py-4 sm:px-6">
                    {editingId === c.id ? (
                      <div className="space-y-3">
                        <p className="break-all font-mono text-sm font-medium">{c.configKey}</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Field label="Value" htmlFor={`v-${c.id}`}>
                            <Input id={`v-${c.id}`} value={editForm.configValue ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, configValue: e.target.value }))} />
                          </Field>
                          <Field label="Type" htmlFor={`t-${c.id}`}>
                            <select id={`t-${c.id}`} className={selectClass} value={editForm.configType ?? 'string'} onChange={(e) => setEditForm((p) => ({ ...p, configType: e.target.value }))}>
                              {TYPES.map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <Field label="Description" htmlFor={`d-${c.id}`}>
                          <Input id={`d-${c.id}`} value={editForm.description ?? ''} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                        </Field>
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input type="checkbox" className="h-4 w-4 accent-primary" checked={editForm.isSecret ?? false} onChange={(e) => setEditForm((p) => ({ ...p, isSecret: e.target.checked }))} />
                          Secret
                        </label>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => update.mutate({ id: c.id, body: editForm })} disabled={update.isPending}>
                            {update.isPending ? 'Saving…' : 'Save'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="break-all font-mono text-sm">{c.configKey}</code>
                            <Badge variant="outline">{c.configType}</Badge>
                            {c.isSecret && <Badge variant="warning">secret</Badge>}
                          </div>
                          {c.description && <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>}
                          <p className="mt-1 break-all font-mono text-sm font-medium">{c.isSecret ? '••••••••' : c.configValue}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Updated {new Date(c.updatedAt).toLocaleDateString('en-KE')}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(c.id);
                              setEditForm({ configValue: c.configValue, configType: c.configType, description: c.description, isSecret: c.isSecret });
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="icon" variant="ghost" aria-label={`Delete ${c.configKey}`} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleting(c)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </SectionCard>
          ))}

      <ConfirmDialog
        open={!!deleting}
        title="Delete this config?"
        description={deleting ? `${deleting.configKey} will be removed. The service falls back to its built-in default.` : undefined}
        confirmLabel="Delete"
        pending={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
