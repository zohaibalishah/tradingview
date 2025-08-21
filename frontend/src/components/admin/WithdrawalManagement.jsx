import React from 'react';
import FinancialManagement from './FinancialManagement';

export default function WithdrawalManagement() {
  return (
    <FinancialManagement
      type="withdrawal"
      title="Withdrawal Management"
      description="Manage user withdrawals and fund transfers"
    />
  );
}
