
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
  cost_price: number;
  selling_price: number;
  image: string;
  created_at: string;
  updated_at: string;
};

export type ProductSelect = {
  id: string;
  name: string;
  selling_price: number;
}

export type RecentActivity = {
  id: string;
  type: 'sale' | 'update' | 'new' | 'delete';
  product_name: string;
  product_image?: string;
  details: string;
  timestamp: string; // Should be ISO string date
};

export type SalesData = {
    month: string;
    sales: number;
}

export type Sale = {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  sale_date: string; // Should be ISO string date
};
