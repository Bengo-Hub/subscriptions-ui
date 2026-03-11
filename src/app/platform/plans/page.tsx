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
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Layout, Package, Plus, Save, Trash2, X, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

interface Plan {
  id: string;
  planCode: string;
  name: string;
  description: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  basePrice: number;
  currency: string;
  isActive: boolean;
  tierOrder: number;
  tierLimits: Record<string, any>;
}

export default function PlatformPlansPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = user?.is_platform_owner || user?.tenant_slug === 'codevertex';

  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({
    name: '',
    planCode: '',
    description: '',
    basePrice: 0,
    billingCycle: 'MONTHLY',
    currency: 'KES',
    isActive: true,
    tierOrder: 1,
    tierLimits: {
      max_admins: 2,
      max_riders: 5,
      max_orders_per_day: 300,
      overage_rider_price_per_month: 250,
      overage_orders_price_per_100_month: 375
    }
  });

  useEffect(() => {
    if (user && !isPlatformOwner) router.replace('/');
  }, [user, isPlatformOwner, router]);

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () => {
      const resp = await apiClient.get<{ plans: Plan[] }>('/api/v1/plans');
      return resp.plans;
    },
    enabled: !!isPlatformOwner,
  });

  const plans = plansData || [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<Plan>) => apiClient.post('/api/v1/admin/plans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Subscription plan created successfully');
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create plan'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Plan> }) =>
      apiClient.put(`/api/v1/admin/plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan updated successfully');
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to update plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan deleted');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to delete plan'),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    setForm({
      name: '',
      planCode: '',
      description: '',
      basePrice: 0,
      billingCycle: 'MONTHLY',
      currency: 'KES',
      isActive: true,
      tierOrder: 1,
      tierLimits: {
        max_admins: 2,
        max_riders: 5,
        max_orders_per_day: 300,
        overage_rider_price_per_month: 250,
        overage_orders_price_per_100_month: 375
      }
    });
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({ ...plan });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (!isPlatformOwner) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Membership Tiers</h1>
          <p className="text-slate-500 mt-1 font-medium">Configure and manage platform-wide subscription packages.</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90 h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Tier
        </Button>
      </div>


      {showForm && (
        <div
          className="overflow-auto"
        >
          <Card className="border-2 border-primary/20 shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 px-10 py-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Layout className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {editingPlan ? `Editing ${editingPlan.name}` : 'New Tier Configuration'}
                  </h2>
                </div>
                <Button variant="ghost" size="icon" onClick={resetForm} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-700">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Display Name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Starter (Lite)"
                    className="h-12 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plan Code (UPPERCASE)</label>
                  <Input
                    value={form.planCode}
                    onChange={(e) => setForm((p) => ({ ...p, planCode: e.target.value.toUpperCase() }))}
                    placeholder="e.g. STARTER"
                    className="h-12 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary font-black tracking-widest"
                    disabled={!!editingPlan}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Price ({form.currency})</label>
                  <Input
                    type="number"
                    value={form.basePrice}
                    onChange={(e) => setForm((p) => ({ ...p, basePrice: Number(e.target.value) }))}
                    className="h-12 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Billing Cycle</label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => setForm((p) => ({ ...p, billingCycle: e.target.value as any }))}
                    className="flex h-12 w-full rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-transparent px-4 py-2 text-sm font-bold focus:border-primary"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="High-level summary of the tier benefits..."
                  className="h-12 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary font-medium"
                />
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Tier Limits & Overages
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-3 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Max Riders</label>
                    <Input
                      type="number"
                      value={form.tierLimits?.max_riders}
                      onChange={(e) => setForm((p) => ({ ...p, tierLimits: { ...p.tierLimits, max_riders: Number(e.target.value) } }))}
                      className="bg-white dark:bg-slate-900 border-none h-10 shadow-sm font-bold"
                    />
                  </div>
                  <div className="space-y-3 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black uppercase tracking-widest text-purple-500">Max Orders / Day</label>
                    <Input
                      type="number"
                      value={form.tierLimits?.max_orders_per_day}
                      onChange={(e) => setForm((p) => ({ ...p, tierLimits: { ...p.tierLimits, max_orders_per_day: Number(e.target.value) } }))}
                      className="bg-white dark:bg-slate-900 border-none h-10 shadow-sm font-bold"
                    />
                  </div>
                  <div className="space-y-3 p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-500">Extra Rider Fee (KES)</label>
                    <Input
                      type="number"
                      value={form.tierLimits?.overage_rider_price_per_month}
                      onChange={(e) => setForm((p) => ({ ...p, tierLimits: { ...p.tierLimits, overage_rider_price_per_month: Number(e.target.value) } }))}
                      className="bg-white dark:bg-slate-900 border-none h-10 shadow-sm font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-end pt-6">
                <Button variant="ghost" onClick={resetForm} className="rounded-xl font-bold px-8">Discard</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="bg-primary text-white shadow-xl shadow-primary/20 hover:bg-primary/90 h-14 px-10 rounded-2xl font-black uppercase tracking-widest text-sm"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {editingPlan ? 'Overwrite Tier' : 'Deploy Tier'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Plans Table */}
      <Card className="rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="px-10 py-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
              <Package className="h-5 w-5 text-slate-500" />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Active Catalog</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : plans.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800/50">
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</TableHead>
                    <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Code</TableHead>
                    <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Price (KES)</TableHead>
                    <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Cycle</TableHead>
                    <TableHead className="py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.sort((a, b) => a.tierOrder - b.tierOrder).map((plan) => (
                    <TableRow key={plan.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800/50 transition-colors">
                      <TableCell className="px-10 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-white">{plan.name}</span>
                          <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{plan.description || 'No description'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none font-black text-[10px] tracking-widest px-3 py-1">
                          {plan.planCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black text-slate-900 dark:text-white">
                        {plan.basePrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="font-bold text-xs uppercase tracking-tighter text-slate-500">
                        {plan.billingCycle}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", plan.isActive ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                            {plan.isActive ? 'Live' : 'Hidden'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-10 py-6 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(plan)}
                            className="rounded-xl hover:bg-blue-500/10 hover:text-blue-500 transition-colors"
                          >
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Are you absolutely sure? This will remove the tier from the catalog.')) {
                                deleteMutation.mutate(plan.id);
                              }
                            }}
                            className="rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-20 text-center space-y-4">
              <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800 w-16 h-16 mx-auto flex items-center justify-center">
                <Package className="h-8 w-8 text-slate-300" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white">No tiers identified</h4>
                <p className="text-sm text-slate-500">The membership catalog is currently empty. Click "Create New Tier" to begin.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
