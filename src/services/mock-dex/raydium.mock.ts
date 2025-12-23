import config from '../../config/config';

export interface DEXQuote {
  dex: string;
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  price: number;
  fee: number;
}

export interface DEXExecutionResult {
  txHash: string;
  executedPrice: number;
  executedAmount: number;
  actualSlippage: number;
}

class RaydiumMock {
  private readonly fee = 0.003;

  async getQuote(inputToken: string, outputToken: string, inputAmount: number): Promise<DEXQuote> {
    await this.sleep(config.mockDex?.quoteDelayMs || 200);

    const basePrice = 1.0;
    const priceVariation = 0.98 + Math.random() * 0.04;
    const price = basePrice * priceVariation;

    const outputAmount = inputAmount * price * (1 - this.fee);

    return {
      dex: 'Raydium',
      inputToken,
      outputToken,
      inputAmount,
      outputAmount,
      price,
      fee: this.fee
    };
  }

  async executeSwap(quote: DEXQuote): Promise<DEXExecutionResult> {
    await this.sleep(config.mockDex?.executionDelayMs || 2500);

    if (Math.random() < (config.mockDex?.failureRate || 0.05)) {
      throw new Error('Raydium: Simulated swap execution failure');
    }

    const slippageFactor = 0.99 + Math.random() * 0.02;
    const executedPrice = quote.price * slippageFactor;
    const executedAmount = quote.outputAmount * slippageFactor;
    const actualSlippage = Math.abs(1 - slippageFactor) * 100;

    const txHash = this.generateMockTxHash();

    return {
      txHash,
      executedPrice,
      executedAmount,
      actualSlippage
    };
  }

  private generateMockTxHash(): string {
    const chars = '0123456789abcdef';
    let hash = '';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new RaydiumMock();
