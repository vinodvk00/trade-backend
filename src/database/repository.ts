import { v7 as uuidv7 } from 'uuid';
import { query } from './connection';
import { Order, OrderStatus } from '../models/types';

export class OrderRepository {
  async create(orderData: {
    userWallet: string;
    inputToken: string;
    outputToken: string;
    inputAmount: number;
  }): Promise<Order> {
    const id = uuidv7();
    const sql = `
      INSERT INTO orders (id, user_wallet, input_token, output_token, input_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await query(sql, [
      id,
      orderData.userWallet,
      orderData.inputToken,
      orderData.outputToken,
      orderData.inputAmount,
      OrderStatus.PENDING
    ]);

    return this.mapToOrder(result.rows[0]);
  }

  async findById(id: string): Promise<Order | null> {
    const sql = 'SELECT * FROM orders WHERE id = $1';
    const result = await query(sql, [id]);

    return result.rows[0] ? this.mapToOrder(result.rows[0]) : null;
  }

  async updateStatus(id: string, status: OrderStatus, error?: string): Promise<Order | null> {
    const sql = `
      UPDATE orders
      SET status = $1, error = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(sql, [status, error || null, id]);
    return result.rows[0] ? this.mapToOrder(result.rows[0]) : null;
  }

  async updateExecution(
    id: string,
    data: {
      selectedDex: string;
      outputAmount: number;
      txHash: string;
      status: OrderStatus;
    }
  ): Promise<Order | null> {
    const sql = `
      UPDATE orders
      SET selected_dex = $1, output_amount = $2, tx_hash = $3, status = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `;

    const result = await query(sql, [
      data.selectedDex,
      data.outputAmount,
      data.txHash,
      data.status,
      id
    ]);

    return result.rows[0] ? this.mapToOrder(result.rows[0]) : null;
  }

  async findByUserWallet(userWallet: string): Promise<Order[]> {
    const sql = 'SELECT * FROM orders WHERE user_wallet = $1 ORDER BY created_at DESC';
    const result = await query(sql, [userWallet]);

    return result.rows.map(row => this.mapToOrder(row));
  }

  private mapToOrder(row: Record<string, unknown>): Order {
    return {
      id: row.id as string,
      userWallet: row.user_wallet as string,
      inputToken: row.input_token as string,
      outputToken: row.output_token as string,
      inputAmount: parseFloat(row.input_amount as string),
      outputAmount: row.output_amount ? parseFloat(row.output_amount as string) : undefined,
      selectedDex: row.selected_dex as string | undefined,
      status: row.status as OrderStatus,
      txHash: row.tx_hash as string | undefined,
      error: row.error as string | undefined,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date
    };
  }
}

export default new OrderRepository();
