export enum OrderStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

export interface Order {
  id: string;
  userWallet: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount?: number;
  selectedDex?: string;
  status: OrderStatus;
  txHash?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
