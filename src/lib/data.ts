import type { Product, RecentActivity, Store } from './types';

export const stores: Store[] = [
  { id: '1', name: 'Main Street Branch' },
  { id: '2', name: 'Downtown Superstore' },
  { id: '3', name: 'Westside Market' },
];

export const products: Product[] = [
  { id: '1', sku: 'LAP-001', name: 'ProBook Laptop', category: 'Electronics', stock: 15, costPrice: 800, sellingPrice: 1200, image: 'https://placehold.co/40x40.png' },
  { id: '2', sku: 'SMT-002', name: 'Galaxy Smartphone', category: 'Electronics', stock: 3, costPrice: 600, sellingPrice: 999, image: 'https://placehold.co/40x40.png' },
  { id: '3', sku: 'HDP-003', name: 'Wireless Headphones', category: 'Accessories', stock: 50, costPrice: 80, sellingPrice: 149, image: 'https://placehold.co/40x40.png' },
  { id: '4', sku: 'OFF-004', name: 'Ergonomic Chair', category: 'Furniture', stock: 8, costPrice: 250, sellingPrice: 450, image: 'https://placehold.co/40x40.png' },
  { id: '5', sku: 'BOK-005', name: 'Next.js for Pros', category: 'Books', stock: 100, costPrice: 25, sellingPrice: 49, image: 'https://placehold.co/40x40.png' },
  { id: '6', sku: 'CAM-006', name: '4K Action Camera', category: 'Electronics', stock: 2, costPrice: 300, sellingPrice: 499, image: 'https://placehold.co/40x40.png' },
];

export const recentActivities: RecentActivity[] = [
  { id: '1', type: 'sale', productName: 'ProBook Laptop', details: '2 units sold', timestamp: '2 minutes ago' },
  { id: '2', type: 'update', productName: 'Ergonomic Chair', details: 'Stock updated to 8 units', timestamp: '1 hour ago' },
  { id: '3', type: 'new', productName: 'Smart Watch', details: 'New product added', timestamp: '3 hours ago' },
  { id: '4', type: 'sale', productName: 'Wireless Headphones', details: '5 units sold', timestamp: '1 day ago' },
];

export const inventoryValue = products.reduce((acc, product) => acc + (product.stock * product.costPrice), 0);

export const lowStockProducts = products.filter(p => p.stock < 5);

export const salesData = [
    { month: 'Jan', sales: 4000 },
    { month: 'Feb', sales: 3000 },
    { month: 'Mar', sales: 5000 },
    { month: 'Apr', sales: 4500 },
    { month: 'May', sales: 6000 },
    { month: 'Jun', sales: 5500 },
];
