/**
 * Admin entity — wallet addresses with admin access to specific forms.
 */
export interface Admin {
  id: string;
  formId: string;
  walletAddress: string;
  createdAt: Date;
}
