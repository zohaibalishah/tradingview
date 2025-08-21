import React from 'react';
import FinancialManagement from './FinancialManagement';

export default function DepositManagement() {
  return (
    <FinancialManagement
      type="deposit"
      title="Deposit Management"
      description="Manage user deposits and fund transfers"
    />
  );
}
