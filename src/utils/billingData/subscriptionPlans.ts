export type SubscriptionPlan = {
  id: 'free' | 'basic' | 'basic/en';
  name: string;
  price: string;
  features: {
    name: string;
    included: boolean;
  }[];
};

export type SubscriptionPlanJa = {
  id: 'free' | 'basic';
  name: string;
  price: string;
  features: {
    name: string;
    included: boolean;
  }[];
};

export type SubscriptionPlanEn = {
  id: 'free' | 'basic/en';
  name: string;
  price: string;
  features: {
    name: string;
    included: boolean;
  }[];
};

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Freeプラン',
    price: '¥0/月',
    features: [
      { name: '基本機能の利用', included: true },
      { name: 'ボーナスSpryt', included: false },
      { name: '追加Spryt購入', included: false },
      { name: 'FramePlanner クラウドストレージ', included: false },
    ]
  },
  {
    id: 'basic',
    name: 'Basicプラン',
    price: '¥500/月',
    features: [
      { name: '基本機能の利用', included: true },
      { name: 'ボーナス 400Spryt/月', included: true },
      { name: '追加Spryt購入 300Spryt/500円', included: true },
      { name: 'FramePlanner クラウドストレージ(実験中)', included: true },
    ]
  }
];

export const subscriptionPlansEn: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Plan',
    price: '$0/month',
    features: [
      { name: 'Basic features', included: true },
      { name: 'Bonus Spryt', included: false },
      { name: 'Additional Spryt purchase', included: false },
      { name: 'FramePlanner Cloud Storage', included: false },
    ]
  },
  {
    id: 'basic/en',
    name: 'Basic Plan',
    price: '$4.99/month',
    features: [
      { name: 'Basic features', included: true },
      { name: 'Bonus 600 Spryt/month', included: true },
      { name: 'Additional Spryt purchase available', included: true },
      { name: 'FramePlanner Cloud Storage (Beta)', included: true },
    ]
  }
];