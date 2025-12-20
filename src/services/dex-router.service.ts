import raydium from './mock-dex/raydium.mock';
import meteora from './mock-dex/meteora.mock';
import logger from '../utils/logger';
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
    logger.info('Fetching quotes from all DEXs', { inputToken, outputToken, inputAmount });

    const [raydiumQuote, meteoraQuote] = await Promise.all([
      raydium.getQuote(inputToken, outputToken, inputAmount),
      meteora.getQuote(inputToken, outputToken, inputAmount)
    ]);

    const selectedQuote =
      raydiumQuote.outputAmount > meteoraQuote.outputAmount ? raydiumQuote : meteoraQuote;

    const alternativeQuote = selectedQuote.dex === 'Raydium' ? meteoraQuote : raydiumQuote;

    const priceDifference = selectedQuote.outputAmount - alternativeQuote.outputAmount;
    const priceDifferencePercent = (priceDifference / alternativeQuote.outputAmount) * 100;

    logger.info(
      `DEX Router selected ${selectedQuote.dex}: ${selectedQuote.outputAmount.toFixed(4)} ${outputToken} vs ${alternativeQuote.dex}: ${alternativeQuote.outputAmount.toFixed(4)} ${outputToken} (${priceDifferencePercent > 0 ? '+' : ''}${priceDifferencePercent.toFixed(2)}%)`,
      {
        selectedDex: selectedQuote.dex,
        selectedOutput: selectedQuote.outputAmount,
        alternativeDex: alternativeQuote.dex,
        alternativeOutput: alternativeQuote.outputAmount,
        difference: priceDifference,
        differencePercent: priceDifferencePercent
      }
    );

    return {
      selectedQuote,
      alternativeQuote,
      priceDifference,
      priceDifferencePercent
    };
  }

  async executeSwap(quote: DEXQuote): Promise<DEXExecutionResult> {
    logger.info(`Executing swap on ${quote.dex}`, {
      dex: quote.dex,
      inputToken: quote.inputToken,
      outputToken: quote.outputToken,
      inputAmount: quote.inputAmount,
      expectedOutput: quote.outputAmount
    });

    if (quote.dex === 'Raydium') {
      return await raydium.executeSwap(quote);
    } else if (quote.dex === 'Meteora') {
      return await meteora.executeSwap(quote);
    }

    throw new Error(`Unknown DEX: ${quote.dex}`);
  }
}

export default new DEXRouterService();
