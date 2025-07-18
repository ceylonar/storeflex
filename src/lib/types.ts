
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
  created_at: string; // Changed from Timestamp to string
  updated_at: string; // Changed from Timestamp to string
};

export type RecentActivity = {
  id: string;
  type: 'sale' | 'update' | 'new' | 'delete';
  product_name: string;
  details: string;
  timestamp: string; // Should be ISO string date
};

export type SalesData = {
    month: string;
    sales: number;
}
