import React from 'react';
import AdminLayout from '../../components/layouts/AdminLayout';
import CategoryManagement from '../../components/admin/CategoryManagement';

export default function Categories() {
  return (
    <AdminLayout>
      <CategoryManagement />
    </AdminLayout>
  );
}
