/** Invoice lifecycle. Numbers assigned only on FINALIZED. */
export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  FINALIZED: 'FINALIZED',
  APPROVED: 'APPROVED',
  CANCELLED: 'CANCELLED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

/** Expense workflow: Draft → Submitted → Review → Approved/Rejected → (Paid/Reimbursed) → Closed. */
export const ExpenseStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
} as const;
export type ExpenseStatus = (typeof ExpenseStatus)[keyof typeof ExpenseStatus];

/** Who fronted the money — drives the payment vs reimbursement track. */
export const PaymentType = {
  COMPANY_PAID: 'COMPANY_PAID',
  REIMBURSABLE: 'REIMBURSABLE',
} as const;
export type PaymentType = (typeof PaymentType)[keyof typeof PaymentType];

/** Vendor settlement (COMPANY_PAID track). */
export const PaymentStatus = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Employee repayment (REIMBURSABLE track). */
export const ReimbursementStatus = {
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  PENDING: 'PENDING',
  REIMBURSED: 'REIMBURSED',
} as const;
export type ReimbursementStatus =
  (typeof ReimbursementStatus)[keyof typeof ReimbursementStatus];
