import React from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import WithdrawalManagement from '../../components/admin/WithdrawalManagement';

export default function WithdrawalManagementPage() {
  return (
    <AdminLayout>
      <WithdrawalManagement />
    </AdminLayout>
  );
}
