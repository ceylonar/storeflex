
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
        const justUpdatedProduct = updatedProducts.find(p => p.id === selectedProduct?.id);
        if(justUpdatedProduct) {
            setSelectedProduct(justUpdatedProduct);
        }
    };

    const handleCreateOrUpdate = () => {
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
