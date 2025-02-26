export type SprytPackage = {
  id: 'small' | 'medium' | 'large';
  name: string;
  amount: number;
  price: string;
  priceInYen: number;
};

export const sprytPackages: SprytPackage[] = [
  {
    id: 'small',
    name: 'スモールパック',
    amount: 300,
    price: '¥500',
    priceInYen: 500
  },
  {
    id: 'medium',
    name: 'ミディアムパック',
    amount: 650,
    price: '¥1,000',
    priceInYen: 1000
  },
  {
    id: 'large',
    name: 'ラージパック',
    amount: 1400,
    price: '¥2,000',
    priceInYen: 2000
  }
];