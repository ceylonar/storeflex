

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
    logoUrl?: string;
    googleSheetUrl?: string;
};

export type Product = {
  id: string;
  userId: string;
  sku: string;
  barcode?: string;
  name: string;
  category: string;
  sub_category?: string;
  brand?: string;
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
  cost_price: number;
  image?: string;
  stock: number;
  category: string;
  brand?: string;
  sub_category?: string;
  barcode?: string;
}

export type RecentActivity = {
  id: string;
  userId: string;
  type: 'sale' | 'update' | 'new' | 'delete' | 'purchase' | 'credit_settled' | 'check_cleared' | 'check_rejected';
  product_id?: string;
  product_name?: string;
  product_image?: string;
  details: string;
  timestamp: string; // Should be ISO string date
};

export type DetailedRecord = Omit<RecentActivity, 'details'> & {
    items?: (SaleItem | PurchaseItem)[];
    product_sku?: string;
    details?: string;
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
    sku?: string;
    sub_category?: string;
};

export type Sale = {
  id: string;
  userId: string;
  items: Omit<SaleItem, 'stock'>[];
  item_ids: string[];
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
  paymentMethod: 'cash' | 'credit' | 'check';
  amountPaid: number;
  creditAmount: number;
  checkNumber?: string;
  paymentStatus: 'paid' | 'partial' | 'pending_check_clearance' | 'rejected';
  previousBalance: number;
};

export type Customer = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at?: string;
  credit_balance: number;
};

export type Supplier = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at?: string;
  credit_balance: number;
};

export type PurchaseItem = {
  id: string;
  name: string;
  image?: string;
  quantity: number;
  cost_price: number;
  total_cost: number;
  sku?: string;
};

export type Purchase = {
  id: string;
  userId: string;
  supplier_id: string;
  supplier_name: string;
  items: PurchaseItem[];
  item_ids: string[];
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount_amount: number;
  service_charge: number;
  total_amount: number;
  purchase_date: string; // ISO String
  paymentMethod: 'cash' | 'credit' | 'check';
  amountPaid: number;
  creditAmount: number;
  checkNumber?: string;
  paymentStatus: 'paid' | 'partial' | 'pending_check_clearance' | 'rejected';
  previousBalance: number;
}

export type ProductTransaction = {
    type: 'sale' | 'purchase';
    date: string; // ISO String
    quantity: number;
    price: number; // cost_price for purchase, selling_price for sale
    source_or_destination: string; // e.g., "Sale to John Doe" or "Purchase from Supplier Inc."
}

export type MoneyflowTransaction = {
    id: string; // Can be a sale, purchase, customer, or supplier ID
    type: 'receivable' | 'payable';
    partyName: string; // Customer or Supplier Name
    partyId: string;
    paymentMethod: 'credit' | 'check';
    amount: number;
    date: string; // ISO String
    checkNumber?: string;
};
