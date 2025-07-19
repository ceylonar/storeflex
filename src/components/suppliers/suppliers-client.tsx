
'use client';

import * as React from 'react';
import { SuppliersTable } from './suppliers-table';
import { PurchaseHistory } from './purchase-history';
import type { Supplier } from '@/lib/types';

interface SuppliersClientProps {
    initialSuppliers: Supplier[];
}

export function SuppliersClient({ initialSuppliers }: SuppliersClientProps) {
    const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);

    return (
        <div className="space-y-8">
            <SuppliersTable initialSuppliers={initialSuppliers} onViewHistory={setSelectedSupplier} />
            <PurchaseHistory selectedSupplier={selectedSupplier} />
        </div>
    );
}
