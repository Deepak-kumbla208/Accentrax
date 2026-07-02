/**
 * Dynamic permission keys. Seeded into the `permissions` table (Phase 1)
 * and enforced by the backend PermissionsGuard + scoped queries.
 */
export const Permission = {
  // Invoicing
  INVOICE_GENERATE: 'invoice.generate',
  INVOICE_EDIT: 'invoice.edit',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_PRINT: 'invoice.print',
  INVOICE_VIEW_OWN: 'invoice.view_own',
  INVOICE_VIEW_COMPANY: 'invoice.view_company',
  INVOICE_VIEW_ALL: 'invoice.view_all',

  // Expenses
  EXPENSE_CREATE: 'expense.create',
  EXPENSE_APPROVE: 'expense.approve',
  EXPENSE_REJECT: 'expense.reject',
  EXPENSE_MARK_PAID: 'expense.mark_paid',
  EXPENSE_REIMBURSE: 'expense.reimburse',
  EXPENSE_VIEW_OWN: 'expense.view_own',
  EXPENSE_VIEW_COMPANY: 'expense.view_company',
  EXPENSE_VIEW_ALL: 'expense.view_all',

  // Platform
  EXPORT: 'export',
  MASTERS_MANAGE: 'masters.manage',
  DASHBOARD_VIEW: 'dashboard.view',
  REPORTS_VIEW: 'reports.view',
  OCR_USE: 'ocr.use',
  INTEGRATIONS_MANAGE: 'integrations.manage',
  SETTINGS_MANAGE: 'settings.manage',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export interface PermissionMeta {
  key: Permission;
  label: string;
  group: 'Invoicing' | 'Expenses' | 'Platform';
}

export const PERMISSION_CATALOG: PermissionMeta[] = [
  { key: Permission.INVOICE_GENERATE, label: 'Generate Invoice', group: 'Invoicing' },
  { key: Permission.INVOICE_EDIT, label: 'Edit Invoice', group: 'Invoicing' },
  { key: Permission.INVOICE_DELETE, label: 'Delete Invoice', group: 'Invoicing' },
  { key: Permission.INVOICE_PRINT, label: 'Print Invoice', group: 'Invoicing' },
  { key: Permission.INVOICE_VIEW_OWN, label: 'View Own Invoice', group: 'Invoicing' },
  { key: Permission.INVOICE_VIEW_COMPANY, label: 'View Company Invoice', group: 'Invoicing' },
  { key: Permission.INVOICE_VIEW_ALL, label: 'View All Invoices', group: 'Invoicing' },
  { key: Permission.EXPENSE_CREATE, label: 'Create Expense', group: 'Expenses' },
  { key: Permission.EXPENSE_APPROVE, label: 'Approve Expense', group: 'Expenses' },
  { key: Permission.EXPENSE_REJECT, label: 'Reject Expense', group: 'Expenses' },
  { key: Permission.EXPENSE_MARK_PAID, label: 'Mark Expense Paid', group: 'Expenses' },
  { key: Permission.EXPENSE_REIMBURSE, label: 'Reimburse Expense', group: 'Expenses' },
  { key: Permission.EXPENSE_VIEW_OWN, label: 'View Own Expense', group: 'Expenses' },
  { key: Permission.EXPENSE_VIEW_COMPANY, label: 'View Company Expense', group: 'Expenses' },
  { key: Permission.EXPENSE_VIEW_ALL, label: 'View All Expenses', group: 'Expenses' },
  { key: Permission.EXPORT, label: 'Export Data', group: 'Platform' },
  { key: Permission.MASTERS_MANAGE, label: 'Manage Masters', group: 'Platform' },
  { key: Permission.DASHBOARD_VIEW, label: 'View Dashboard', group: 'Platform' },
  { key: Permission.REPORTS_VIEW, label: 'View Reports', group: 'Platform' },
  { key: Permission.OCR_USE, label: 'Use OCR', group: 'Platform' },
  { key: Permission.INTEGRATIONS_MANAGE, label: 'Manage Integrations', group: 'Platform' },
  { key: Permission.SETTINGS_MANAGE, label: 'Manage Settings', group: 'Platform' },
];

export const ALL_PERMISSION_KEYS: Permission[] = PERMISSION_CATALOG.map((p) => p.key);
