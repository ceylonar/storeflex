
'use client';

import * as React from 'react';
import { SuppliersTable } from './suppliers-table';
import { PurchaseHistory } from './purchase-history';
import type { Supplier } from '@/lib/types';
import { fetchSuppliers } from '@/lib/queries';

interface SuppliersClientProps {
    initialSuppliers: Supplier[];
}

export function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
    const [suppliers, setSuppliers] = React.useState<Supplier[]>(initialSuppliers);
    const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);

    const refreshSuppliers = async () => {
        const updatedSuppliers = await fetchSuppliers();
        setSuppliers(updatedSuppliers);
    };

    const handleCreateOrUpdate = (supplier: Supplier) => {
        // Optimistically update the list for faster UI response
        const exists = suppliers.some(s => s.id === supplier.id);
        if (exists) {
            setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
        } else {
            setSuppliers(prev => [supplier, ...prev]);
        }
        // Then re-fetch for consistency
        refreshSuppliers();
    };

    const handleDelete = (supplierId: string) => {
        setSuppliers(prev => prev.filter(s => s.id !== supplierId));
        if (selectedSupplier?.id === supplierId) {
            setSelectedSupplier(null);
        }
    };

    return (
        <div className="space-y-8">
            <SuppliersTable 
                suppliers={suppliers} 
                onViewHistory={setSelectedSupplier}
                onSupplierCreated={handleCreateOrUpdate}
                onSupplierUpdated={handleCreateOrUpdate}
                onSupplierDeleted={handleDelete}
            />
            <PurchaseHistory selectedSupplier={selectedSupplier} />
        </div>
    );
}
