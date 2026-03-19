'use client';

import { Badge, Button, Card, CardContent, CardHeader } from '@/components/ui/base';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Check, X, ShieldCheck, Zap, Building2, Sparkles, MessageCircle, BarChart3, Globe, Users, ShoppingCart, Truck, CreditCard, Layout, Smartphone, MapPin, Receipt, Layers, Headphones } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';


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

interface CurrentSubscription {
  id: string;
  planId: string;
  planCode: string;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string;
}

const FEATURE_CATEGORIES = [
  {
    name: 'Platform Core',
    icon: ShieldCheck,
    features: [
      { name: 'Admin Dashboard', starter: true, growth: true, professional: true },
      { name: 'Custom Domain Support', starter: true, growth: true, professional: true },
      { name: 'Multi-outlet Support', starter: false, growth: true, professional: true },
      { name: 'White-labeling', starter: false, growth: false, professional: true },
      { name: 'API Webhooks', starter: false, growth: false, professional: true },
    ]
  },
  {
    name: 'Operations & Scaling',
    icon: Building2,
    features: [
      { name: 'Max Outlets', starter: '1', growth: '3', professional: 'Unlimited' },
      { name: 'Max Admins', starter: '2', growth: '3', professional: 'Unlimited' },
      { name: 'Max Riders', starter: '5', growth: '15', professional: '30' },
      { name: 'Max Orders / Day', starter: '300', growth: '1,000', professional: '2,500' },
    ]
  },
  {
    name: 'Customer Experience',
    icon: Smartphone,
    features: [
      { name: 'Web & PWA Ordering', starter: true, growth: true, professional: true },
      { name: 'Dedicated Rider App', starter: true, growth: true, professional: true },
      { name: 'Loyalty Program Engine', starter: false, growth: true, professional: true },
      { name: 'Promo Codes & Discounts', starter: false, growth: true, professional: true },
      { name: 'Group Ordering', starter: false, growth: true, professional: true },
    ]
  },
  {
    name: 'Intelligence & Tracking',
    icon: BarChart3,
    features: [
      { name: 'Basic Analytics', starter: true, growth: true, professional: true },
      { name: 'OpenStreetMap Tracking', starter: true, growth: true, professional: true },
      { name: 'Advanced Reports', starter: false, growth: true, professional: true },
      { name: 'Google Maps (Premium)', starter: false, growth: false, professional: true },
      { name: 'Route Optimization (AI)', starter: false, growth: false, professional: true },
    ]
  },
  {
    name: 'Payments & Support',
    icon: CreditCard,
    features: [
      { name: 'M-Pesa Integration', starter: true, growth: true, professional: true },
      { name: 'Paystack Gateway', starter: false, growth: true, professional: true },
      { name: 'POS Integration', starter: false, growth: false, professional: true },
      { name: 'Community Support', starter: true, growth: true, professional: true },
      { name: 'Priority Support (4h SLA)', starter: false, growth: false, professional: true },
    ]
  }
];

export default function PlansPage() {
  const router = useRouter();
  const { data: currentSub } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => apiClient.get<CurrentSubscription>('/api/v1/subscription'),
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => apiClient.get<Plan[]>('/api/v1/plans'),
  });

  // Filter only monthly plans for the main cards display
  const monthlyPlans = (plansData || [])
    .filter((p: Plan) => !p.planCode.includes('YEARLY'))
    .sort((a: Plan, b: Plan) => a.tierOrder - b.tierOrder);

  const getTierClass = (code: string) => {
    switch (code) {
      case 'STARTER': return 'from-blue-500/10 to-transparent';
      case 'GROWTH': return 'from-primary/20 to-transparent';
      case 'PROFESSIONAL': return 'from-purple-500/20 to-transparent';
      default: return 'from-slate-500/10 to-transparent';
    }
  };

  const getTierBorder = (code: string, isCurrent: boolean) => {
    if (isCurrent) return 'ring-2 ring-blue-500 border-blue-500 shadow-xl shadow-blue-500/10';
    switch (code) {
      case 'GROWTH': return 'border-primary shadow-lg shadow-primary/5';
      default: return 'border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold mb-6"
          >
            <Sparkles className="h-4 w-4" /> Discover the Power of BengoBox
          </div>
          <h1
            className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6"
          >
            Choose the membership <br />
            <span className="bg-gradient-to-r from-blue-600 to-primary bg-clip-text text-transparent">that's right for you</span>
          </h1>
          <p
            className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto"
          >
            From startups to enterprise chains, we provide the tools you need to grow your food delivery and cafe business.
          </p>
        </div>

        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden underline">
           <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
           <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {monthlyPlans.map((plan, idx) => {
            const isCurrent = currentSub?.planCode === plan.planCode;
            const isGrowth = plan.planCode === 'GROWTH';
            
            return (
              <div
                key={plan.id}
                className="relative"
              >
                <Card className={cn(
                  "h-full flex flex-col rounded-[3rem] p-4 transition-all duration-300 bg-white dark:bg-slate-900 border",
                  getTierBorder(plan.planCode, isCurrent)
                )}>
                  {isGrowth && !isCurrent && (
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg z-20">
                      Recommended
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg z-20">
                      Current Plan
                    </div>
                  )}

                  <div className={cn("rounded-[2.5rem] p-8 h-full flex flex-col bg-gradient-to-b", getTierClass(plan.planCode))}>
                    <div className="mb-8">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-4">
                        <span className="text-5xl font-black text-slate-900 dark:text-white">
                          KES {plan.basePrice.toLocaleString()}
                        </span>
                        <span className="text-slate-500 font-bold">/mo</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed min-h-[4rem]">
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex-1 space-y-4 mb-10">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 dark:border-slate-800 pb-2">Top Features</p>
                      
                      {/* Extraction of specific limits for the cards */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                             {plan.tierLimits.max_orders_per_day} Orders / Day
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                             {plan.tierLimits.max_riders} Rider Seats
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                             {plan.tierLimits.max_admins === -1 ? 'Unlimited' : plan.tierLimits.max_admins} Admin(s)
                          </span>
                        </div>
                        {plan.planCode === 'PROFESSIONAL' && (
                          <div className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                               White-labeling Included
                            </span>
                          </div>
                        )}
                        {plan.planCode === 'GROWTH' && (
                          <div className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                               Loyalty Program
                            </span>
                          </div>
                        )}
                         {plan.planCode === 'STARTER' && (
                          <div className="flex items-center gap-3">
                            <Check className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                               M-Pesa Integration
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant={isGrowth ? 'primary' : 'outline'}
                      className={cn(
                        "w-full h-14 rounded-2xl font-black text-lg transition-all",
                        isCurrent && "opacity-50 cursor-default",
                        isGrowth && "shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90",
                        !isGrowth && "border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                      disabled={isCurrent}
                      onClick={() => {
                        if (isCurrent) return;
                        if (plan.planCode === 'PROFESSIONAL') {
                          window.location.href = 'mailto:sales@codevertex.com';
                          return;
                        }
                        if (!currentSub) {
                          router.push(`/subscribe?plan=${plan.planCode}`);
                          return;
                        }
                        const currentPlanData = monthlyPlans.find((p: Plan) => p.planCode === currentSub.planCode);
                        if (!currentPlanData) {
                          router.push(`/subscribe?plan=${plan.planCode}`);
                          return;
                        }
                        if (plan.tierOrder > currentPlanData.tierOrder) {
                          router.push(`/upgrade?plan=${plan.planCode}`);
                        } else {
                          router.push(`/downgrade?plan=${plan.planCode}`);
                        }
                      }}
                    >
                      {isCurrent ? 'Current Plan' : plan.planCode === 'PROFESSIONAL' ? 'Contact Sales' : (() => {
                        if (!currentSub) return 'Get Started';
                        const currentPlanData = monthlyPlans.find((p: Plan) => p.planCode === currentSub.planCode);
                        if (!currentPlanData) return 'Get Started';
                        return plan.tierOrder > currentPlanData.tierOrder ? 'Upgrade' : 'Downgrade';
                      })()}
                    </Button>
                    
                    {plan.planCode === 'STARTER' && (
                       <p className="text-[10px] text-center text-slate-400 mt-4 font-bold">
                         + KES 10,000 Setup Fee (one-time)
                       </p>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>

        {/* Comparison Section */}
        <div className="mt-32">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Membership features & benefits</h2>
            <p className="text-slate-500">Every membership includes access to our core platform, notification engine, and treasury services.</p>
          </div>

          <div className="grid grid-cols-1 gap-12">
            {FEATURE_CATEGORIES.map((category, catIdx) => (
              <div
                key={category.name}
                className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-4 px-10 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="p-3 rounded-2xl bg-blue-500/10">
                    <category.icon className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{category.name}</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="py-6 px-10 text-xs font-black uppercase tracking-widest text-slate-400">Benefit</th>
                        {monthlyPlans.map((p: Plan) => (
                          <th key={p.id} className="py-6 px-6 text-xs font-black uppercase tracking-widest text-slate-400 text-center">
                            {p.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {category.features.map((feature, featureIdx) => (
                        <tr key={feature.name} className={cn(
                          "group transition-colors",
                          featureIdx !== category.features.length - 1 && "border-b border-slate-50 dark:border-slate-800/50"
                        )}>
                          <td className="py-6 px-10">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-500 transition-colors">
                              {feature.name}
                            </span>
                          </td>
                          {monthlyPlans.map((p: Plan) => {
                            const val = feature[p.planCode.toLowerCase() as keyof typeof feature];
                            return (
                              <td key={p.id} className="py-6 px-6 text-center">
                                {typeof val === 'boolean' ? (
                                  val ? (
                                    <div className="flex justify-center">
                                      <div className="p-1 rounded-full bg-green-500/10 text-green-500">
                                        <Check className="h-4 w-4" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
                                      <X className="h-4 w-4 text-slate-300 dark:text-slate-700" />
                                    </div>
                                  )
                                ) : (
                                  <span className="text-sm font-black text-slate-900 dark:text-white">{val}</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overage and Pricing Note */}
        <div className="mt-20 p-12 rounded-[3.5rem] bg-slate-900 border border-slate-800 relative overflow-hidden">
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-black text-white mb-6">Simple Overage Rates</h3>
              <p className="text-slate-400 mb-8 leading-relaxed text-lg">
                Exceeding your plan’s limits? No worries, you’ll be charged at competitive rates only for what you use beyond your package.
              </p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-blue-500/10 rounded-2xl">
                       <Truck className="h-6 w-6 text-blue-500" />
                     </div>
                     <span className="text-md font-bold text-slate-200">Extra Rider Seat</span>
                  </div>
                  <span className="text-xl font-black text-white">KES 250 <span className="text-xs text-slate-500">/ mo</span></span>
                </div>
                <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-primary/10 rounded-2xl">
                       <ShoppingCart className="h-6 w-6 text-primary" />
                     </div>
                     <span className="text-md font-bold text-slate-200">Extra 100 Orders</span>
                  </div>
                  <span className="text-xl font-black text-white">KES 375 <span className="text-xs text-slate-500">/ mo</span></span>
                </div>
              </div>
            </div>
            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 text-center relative">
              <div className="absolute top-4 right-4 animate-pulse">
                <Badge className="bg-green-500 text-white border-none font-black text-[10px] tracking-widest px-3">SAVE BIG</Badge>
              </div>
              <Layout className="h-16 w-16 text-blue-500 mx-auto mb-6" />
              <h4 className="text-3xl font-black text-white mb-3">Annual Savings</h4>
              <p className="text-slate-400 text-md mb-8">Switch to annual billing and get <span className="text-white font-black underline underline-offset-4 decoration-primary">1 month for free</span> on any plan. Best for long-term growth.</p>
              <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black h-16 rounded-2xl text-xl shadow-2xl">
                Switch to Annual
              </Button>
            </div>
          </div>
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />
        </div>
      </div>
    </div>
  );
}
