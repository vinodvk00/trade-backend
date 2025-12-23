import raydium from './mock-dex/raydium.mock';
import meteora from './mock-dex/meteora.mock';
import type { DEXQuote, DEXExecutionResult } from './mock-dex/raydium.mock';

export interface BestQuoteResult {
  selectedQuote: DEXQuote;
  alternativeQuote: DEXQuote;
  priceDifference: number;
  priceDifferencePercent: number;
}

class DEXRouterService {
  async getBestQuote(
    inputToken: string,
    outputToken: string,
    inputAmount: number
  ): Promise<BestQuoteResult> {
    const [raydiumQuote, meteoraQuote] = await Promise.all([
      raydium.getQuote(inputToken, outputToken, inputAmount),
      meteora.getQuote(inputToken, outputToken, inputAmount)
    ]);

    const selectedQuote =
      raydiumQuote.outputAmount > meteoraQuote.outputAmount ? raydiumQuote : meteoraQuote;

    const alternativeQuote = selectedQuote.dex === 'Raydium' ? meteoraQuote : raydiumQuote;

    const priceDifference = selectedQuote.outputAmount - alternativeQuote.outputAmount;
    const priceDifferencePercent = (priceDifference / alternativeQuote.outputAmount) * 100;

    return {
      selectedQuote,
      alternativeQuote,
      priceDifference,
      priceDifferencePercent
    };
  }

  async executeSwap(quote: DEXQuote): Promise<DEXExecutionResult> {
    if (quote.dex === 'Raydium') {
      return await raydium.executeSwap(quote);
    } else if (quote.dex === 'Meteora') {
      return await meteora.executeSwap(quote);
    }

    throw new Error(`Unknown DEX: ${quote.dex}`);
  }
}

export default new DEXRouterService();
