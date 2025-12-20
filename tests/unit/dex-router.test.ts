import dexRouter from '../../src/services/dex-router.service';
import raydium from '../../src/services/mock-dex/raydium.mock';
import meteora from '../../src/services/mock-dex/meteora.mock';

jest.mock('../../src/services/mock-dex/raydium.mock');
jest.mock('../../src/services/mock-dex/meteora.mock');

describe('DEX Router Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBestQuote', () => {
    it('should select Raydium when it has higher output amount', async () => {
      const raydiumQuote = {
        dex: 'Raydium',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 100,
        price: 10,
        fee: 0.003
      };

      const meteoraQuote = {
        dex: 'Meteora',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 98,
        price: 9.8,
        fee: 0.002
      };

      (raydium.getQuote as jest.Mock).mockResolvedValue(raydiumQuote);
      (meteora.getQuote as jest.Mock).mockResolvedValue(meteoraQuote);

      const result = await dexRouter.getBestQuote('SOL', 'USDC', 10);

      expect(result.selectedQuote.dex).toBe('Raydium');
      expect(result.selectedQuote.outputAmount).toBe(100);
      expect(result.alternativeQuote.dex).toBe('Meteora');
      expect(result.alternativeQuote.outputAmount).toBe(98);
    });

    it('should select Meteora when it has higher output amount', async () => {
      const raydiumQuote = {
        dex: 'Raydium',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 98,
        price: 9.8,
        fee: 0.003
      };

      const meteoraQuote = {
        dex: 'Meteora',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 100,
        price: 10,
        fee: 0.002
      };

      (raydium.getQuote as jest.Mock).mockResolvedValue(raydiumQuote);
      (meteora.getQuote as jest.Mock).mockResolvedValue(meteoraQuote);

      const result = await dexRouter.getBestQuote('SOL', 'USDC', 10);

      expect(result.selectedQuote.dex).toBe('Meteora');
      expect(result.selectedQuote.outputAmount).toBe(100);
    });

    it('should calculate price difference correctly', async () => {
      const raydiumQuote = {
        dex: 'Raydium',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 100,
        price: 10,
        fee: 0.003
      };

      const meteoraQuote = {
        dex: 'Meteora',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 98,
        price: 9.8,
        fee: 0.002
      };

      (raydium.getQuote as jest.Mock).mockResolvedValue(raydiumQuote);
      (meteora.getQuote as jest.Mock).mockResolvedValue(meteoraQuote);

      const result = await dexRouter.getBestQuote('SOL', 'USDC', 10);

      expect(result.priceDifference).toBe(2);
      expect(result.priceDifferencePercent).toBeCloseTo(2.04, 1);
    });

    it('should fetch quotes from both DEXs in parallel', async () => {
      const raydiumQuote = {
        dex: 'Raydium',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 100,
        price: 10,
        fee: 0.003
      };

      const meteoraQuote = {
        dex: 'Meteora',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 98,
        price: 9.8,
        fee: 0.002
      };

      (raydium.getQuote as jest.Mock).mockResolvedValue(raydiumQuote);
      (meteora.getQuote as jest.Mock).mockResolvedValue(meteoraQuote);

      await dexRouter.getBestQuote('SOL', 'USDC', 10);

      expect(raydium.getQuote).toHaveBeenCalledWith('SOL', 'USDC', 10);
      expect(meteora.getQuote).toHaveBeenCalledWith('SOL', 'USDC', 10);
    });
  });

  describe('executeSwap', () => {
    it('should execute swap on Raydium when Raydium quote is provided', async () => {
      const quote = {
        dex: 'Raydium',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 100,
        price: 10,
        fee: 0.003
      };

      const executionResult = {
        txHash: 'abc123',
        executedPrice: 10.05,
        executedAmount: 100.5,
        actualSlippage: 0.5
      };

      (raydium.executeSwap as jest.Mock).mockResolvedValue(executionResult);

      const result = await dexRouter.executeSwap(quote);

      expect(raydium.executeSwap).toHaveBeenCalledWith(quote);
      expect(result.txHash).toBe('abc123');
    });

    it('should execute swap on Meteora when Meteora quote is provided', async () => {
      const quote = {
        dex: 'Meteora',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 100,
        price: 10,
        fee: 0.002
      };

      const executionResult = {
        txHash: 'xyz789',
        executedPrice: 9.95,
        executedAmount: 99.5,
        actualSlippage: 0.5
      };

      (meteora.executeSwap as jest.Mock).mockResolvedValue(executionResult);

      const result = await dexRouter.executeSwap(quote);

      expect(meteora.executeSwap).toHaveBeenCalledWith(quote);
      expect(result.txHash).toBe('xyz789');
    });

    it('should throw error for unknown DEX', async () => {
      const quote = {
        dex: 'UnknownDEX',
        inputToken: 'SOL',
        outputToken: 'USDC',
        inputAmount: 10,
        outputAmount: 100,
        price: 10,
        fee: 0.003
      };

      await expect(dexRouter.executeSwap(quote)).rejects.toThrow('Unknown DEX: UnknownDEX');
    });
  });
});
