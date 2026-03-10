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
import { Edit, Package, Plus, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface PlanFeatures {
  maxOrders: number;
  maxRiders: number;
  maxOutlets: number;
  maxApiCalls: number;
  customBranding: boolean;
  prioritySupport: boolean;
  webhooks: boolean;
  whiteLabel: boolean;
  sla: boolean;
}

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'draft' | 'archived';
  subscriberCount: number;
  features: PlanFeatures;
  createdAt: string;
}

interface PlanFormData {
  name: string;
  tier: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: PlanFeatures;
}

const DEFAULT_FEATURES: PlanFeatures = {
  maxOrders: 500,
  maxRiders: 10,
  maxOutlets: 1,
  maxApiCalls: 1000,
  customBranding: false,
  prioritySupport: false,
  webhooks: false,
  whiteLabel: false,
  sla: false,
};

export default function PlatformPlansPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isPlatformOwner = orgSlug === 'codevertex';

  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormData>({
    name: '',
    tier: 'starter',
    price: 0,
    billingCycle: 'monthly',
    features: { ...DEFAULT_FEATURES },
  });

  useEffect(() => {
    if (user && !isPlatformOwner) router.replace(`/${orgSlug}`);
  }, [user, isPlatformOwner, orgSlug, router]);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: () => apiClient.get<Plan[]>('/api/v1/platform/plans'),
    enabled: !!isPlatformOwner,
  });

  const createMutation = useMutation({
    mutationFn: (data: PlanFormData) => apiClient.post('/api/v1/platform/plans', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan created');
      resetForm();
    },
    onError: () => toast.error('Failed to create plan'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanFormData }) =>
      apiClient.put(`/api/v1/platform/plans/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan updated');
      resetForm();
    },
    onError: () => toast.error('Failed to update plan'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/platform/plans/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-plans'] });
      toast.success('Plan deleted');
    },
    onError: () => toast.error('Failed to delete plan'),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    setForm({ name: '', tier: 'starter', price: 0, billingCycle: 'monthly', features: { ...DEFAULT_FEATURES } });
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      tier: plan.tier,
      price: plan.price,
      billingCycle: plan.billingCycle,
      features: plan.features,
    });
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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plans Management</h1>
          <p className="text-muted-foreground mt-1">Create, edit, and manage subscription plans.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          New Plan
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1">Name</label>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Plan name" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Tier</label>
                <select
                  value={form.tier}
                  onChange={(e) => setForm((p) => ({ ...p, tier: e.target.value }))}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Price</label>
                <Input type="number" min={0} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Cycle</label>
                <select
                  value={form.billingCycle}
                  onChange={(e) => setForm((p) => ({ ...p, billingCycle: e.target.value as any }))}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Feature Limits</label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Max Orders</label>
                  <Input type="number" value={form.features.maxOrders} onChange={(e) => setForm((p) => ({ ...p, features: { ...p.features, maxOrders: Number(e.target.value) } }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Riders</label>
                  <Input type="number" value={form.features.maxRiders} onChange={(e) => setForm((p) => ({ ...p, features: { ...p.features, maxRiders: Number(e.target.value) } }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max Outlets</label>
                  <Input type="number" value={form.features.maxOutlets} onChange={(e) => setForm((p) => ({ ...p, features: { ...p.features, maxOutlets: Number(e.target.value) } }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Max API Calls</label>
                  <Input type="number" value={form.features.maxApiCalls} onChange={(e) => setForm((p) => ({ ...p, features: { ...p.features, maxApiCalls: Number(e.target.value) } }))} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {(['customBranding', 'prioritySupport', 'webhooks', 'whiteLabel', 'sla'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() =>
                    setForm((p) => ({ ...p, features: { ...p.features, [key]: !p.features[key] } }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    form.features[key]
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-input hover:border-primary/50'
                  }`}
                >
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                </button>
              ))}
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">All Plans</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : plans?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="capitalize">{plan.tier}</TableCell>
                    <TableCell>${plan.price}</TableCell>
                    <TableCell className="capitalize">{plan.billingCycle}</TableCell>
                    <TableCell>
                      <Badge variant={plan.status === 'active' ? 'success' : plan.status === 'draft' ? 'warning' : 'outline'}>
                        {plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.subscriberCount}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(plan.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">No plans created yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
