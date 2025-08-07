
'use client';

import * as React from 'react';
import { CustomersTable } from './customers-table';
import { SalesHistory } from './sales-history';
import type { Customer } from '@/lib/types';
import { fetchCustomers } from '@/lib/queries';

interface CustomersClientProps {
    initialCustomers: Customer[];
}

export type SelectableCustomer = Customer | {
    id: 'walk-in';
    name: string;
}

export function CustomersClient({ initialCustomers }: CustomersClientProps) {
    const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
    const [selectedCustomer, setSelectedCustomer] = React.useState<SelectableCustomer | null>(null);

    const refreshCustomers = async () => {
        const updatedCustomers = await fetchCustomers();
        setCustomers(updatedCustomers);
    };

    const handleCreateOrUpdate = (customer: Customer) => {
        // Optimistically update the list for faster UI response
        const exists = customers.some(c => c.id === customer.id);
        if (exists) {
            setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
        } else {
            setCustomers(prev => [customer, ...prev]);
        }
        // Then re-fetch for consistency
        refreshCustomers();
    };

    const handleDelete = (customerId: string) => {
        setCustomers(prev => prev.filter(c => c.id !== customerId));
        if (selectedCustomer?.id === customerId) {
            setSelectedCustomer(null);
        }
    };

    return (
        <div className="space-y-8">
            <CustomersTable 
                customers={customers} 
                onViewHistory={setSelectedCustomer}
                onCustomerCreated={handleCreateOrUpdate}
                onCustomerUpdated={handleCreateOrUpdate}
                onCustomerDeleted={handleDelete}
            />
            <SalesHistory selectedCustomer={selectedCustomer} />
        </div>
    );
}
