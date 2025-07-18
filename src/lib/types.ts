export type Store = {
  id: string;
  name: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  costPrice: number;
  sellingPrice: number;
  image: string;
};

export type RecentActivity = {
  id: string;
  type: 'sale' | 'update' | 'new';
  productName: string;
  details: string;
  timestamp: string;
};
