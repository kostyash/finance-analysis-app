exports.handler = async (event) => {
    // Mock data for initial testing
    const portfolioData = {
      positions: [
        {
          ticker: 'AAPL',
          shares: 10,
          purchasePrice: 150.25,
          purchaseDate: '2024-01-15',
          currentPrice: 175.75,
          currentValue: 1757.50,
          gainLoss: 255.00,
          gainLossPct: 16.97
        },
        {
          ticker: 'MSFT',
          shares: 5,
          purchasePrice: 305.75,
          purchaseDate: '2024-01-20',
          currentPrice: 364.30,
          currentValue: 1821.50,
          gainLoss: 292.75,
          gainLossPct: 19.15
        }
      ],
      summary: {
        totalValue: 3579.00,
        totalCost: 3031.25,
        totalGainLoss: 547.75,
        totalGainLossPct: 18.07
      }
    };
    
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(portfolioData)
    };
  };