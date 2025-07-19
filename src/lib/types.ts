
export type Store = {
  id: string;
  name: string;
};

export type UserProfile = {
    id: string;
    email: string;
    name: string;
    businessName: string;
    address?: string;
    contactNumber?: string;
    googleSheetUrl?: string;
};

export type Product = {
  id: string;
  userId: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  cost_price: number;
  selling_price: number;
  image: string;
  created_at: string;
  updated_at: string;
  low_stock_threshold: number;
};

export type ProductSelect = {
  id: string;
  name: string;
  selling_price: number;
  image?: string;
  stock: number;
}

export type RecentActivity = {
  id: string;
  userId: string;
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

export type TopSellingProduct = {
  name: string;
  totalQuantity: number;
};

export type SaleItem = {
    id: string;
    name: string;
    image?: string;
    quantity: number;
    price_per_unit: number;
    total_amount: number;
    stock: number;
};

export type Sale = {
  id: string;
  userId: string;
  items: Omit<SaleItem, 'stock'>[];
  customer_id: string | null;
  customer_name: string;
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  service_charge: number;
  total_amount: number;
  sale_date: string; // Should be ISO string date
  product_image?: string;
};

export type Customer = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  created_at: string;
};
