export type SubscriptionPlan = {
  id: 'free' | 'basic';
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