
'use client';

import * as React from 'react';
import { InventoryTable } from './inventory-table';
import { ProductHistory } from './product-history';
import type { Product } from '@/lib/types';
import { fetchProducts } from '@/lib/queries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


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

    const physicalProducts = products.filter(p => p.type === 'product');
    const services = products.filter(p => p.type === 'service');

    return (
        <div className="space-y-8">
            <Tabs defaultValue="products" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="products">Products ({physicalProducts.length})</TabsTrigger>
                    <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="products">
                    <InventoryTable 
                        products={physicalProducts}
                        productType="product"
                        onViewHistory={setSelectedProduct}
                        onProductCreated={handleCreateOrUpdate}
                        onProductUpdated={handleCreateOrUpdate}
                        onProductDeleted={handleDelete}
                    />
                </TabsContent>
                <TabsContent value="services">
                    <InventoryTable 
                        products={services}
                        productType="service"
                        onViewHistory={setSelectedProduct}
                        onProductCreated={handleCreateOrUpdate}
                        onProductUpdated={handleCreateOrUpdate}
                        onProductDeleted={handleDelete}
                    />
                </TabsContent>
            </Tabs>

            <ProductHistory selectedProduct={selectedProduct} />
        </div>
    );
}
