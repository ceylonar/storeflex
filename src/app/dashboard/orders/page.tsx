
import { OrderClient } from '@/components/orders/order-client';
import { fetchCustomers, fetchProductsForSelect, fetchSuppliers, fetchPendingOrders } from '@/lib/queries';

export default async function OrdersPage() {
    const products = await fetchProductsForSelect();
    const customers = await fetchCustomers();
    const suppliers = await fetchSuppliers();
    const pendingOrders = await fetchPendingOrders();

    return (
        <OrderClient
            products={products}
            customers={customers}
            suppliers={suppliers}
            initialOrders={pendingOrders}
        />
    )
}
