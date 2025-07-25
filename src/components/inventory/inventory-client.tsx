
'use client';

import * as React from 'react';
import { InventoryTable } from './inventory-table';
import { ProductHistory } from './product-history';
import type { Product } from '@/lib/types';
import { fetchProducts } from '@/lib/queries';

interface InventoryClientProps {
    initialProducts: Product[];
}

export function InventoryClient({ initialProducts }: InventoryClientProps) {
    const [products, setProducts] = React.useState<Product[]>(initialProducts);
    const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

    const refreshProducts = async () => {
        const updatedProducts = await fetchProducts();
        setProducts(updatedProducts);
    };

    const handleCreateOrUpdate = (product: Product) => {
        // Optimistically update the list for faster UI response
        const exists = products.some(p => p.id === product.id);
        if (exists) {
            setProducts(prev => prev.map(p => p.id === product.id ? product : p));
        } else {
            setProducts(prev => [product, ...prev]);
        }
        // Then re-fetch for consistency
        refreshProducts();
    };

    const handleDelete = (productId: string) => {
        setProducts(prev => prev.filter(p => p.id !== productId));
        if (selectedProduct?.id === productId) {
            setSelectedProduct(null);
        }
    };

    return (
        <div className="space-y-8">
            <InventoryTable 
                products={products} 
                onViewHistory={setSelectedProduct}
                onProductCreated={handleCreateOrUpdate}
                onProductUpdated={handleCreateOrUpdate}
                onProductDeleted={handleDelete}
            />
            <ProductHistory selectedProduct={selectedProduct} />
        </div>
    );
}
