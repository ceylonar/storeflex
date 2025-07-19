
'use client';

import * as React from 'react';
import { CustomersTable } from './customers-table';
import { SalesHistory } from './sales-history';
import type { Customer } from '@/lib/types';

interface CustomersClientProps {
    initialCustomers: Customer[];
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

    return (
        <div className="space-y-8">
            <CustomersTable initialCustomers={initialCustomers} onViewHistory={setSelectedCustomer} />
            <SalesHistory selectedCustomer={selectedCustomer} />
        </div>
    );
}
