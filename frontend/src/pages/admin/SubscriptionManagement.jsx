import React from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import SubscriptionManagement from '../../components/admin/SubscriptionManagement';

export default function SubscriptionManagementPage() {
  return (
    <AdminLayout title="Subscription Management">
      <SubscriptionManagement />
    </AdminLayout>
  );
}
