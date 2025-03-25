import json
import boto3
import pandas as pd
import numpy as np
from decimal import Decimal
from datetime import datetime, timedelta

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

def decimal_default(obj):
    """Convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError("Type not serializable")

def lambda_handler(event, context):
    """Main handler for portfolio analysis requests"""
    # Handle OPTIONS requests (preflight)
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Credentials': 'true'
            },
            'body': ''
        }
    try:        
        
        # Get request details
        http_method = event.get('httpMethod')
        path_parameters = event.get('pathParameters', {})      
        query_parameters = event.get('queryStringParameters', {}) or {}
        
         # Try multiple ways to get the user ID
        auth_context = event.get('requestContext', {}).get('authorizer', {})
        
        # Option 1: Direct sub claim access
        user_id = auth_context.get('claims', {}).get('sub')

        # Option 2: Check if sub is directly in authorizer (not nested under claims)
        if not user_id:
            user_id = auth_context.get('sub')


             # Option 3: Check if claims is a string and parse it
        if not user_id and 'claims' in auth_context and isinstance(auth_context['claims'], str):
            try:
                claims = json.loads(auth_context['claims'])
                user_id = claims.get('sub')
            except:
                pass
        
        # Option 4: Try cognito:username if sub is not available
        if not user_id:
            user_id = auth_context.get('claims', {}).get('cognito:username')
            
       
        # Extract resource path to determine which analysis function to call
        resource_path = event.get('resource', '')       
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST'
                },
                'body': json.dumps({'error': 'User not authenticated'})
            }
        
        # Handle different types of analysis
        if http_method == 'GET':
            if resource_path == '/analysis/performance':
                return portfolio_performance_analysis(user_id, query_parameters)
            elif resource_path == '/analysis/technical':
                return technical_indicators(user_id, query_parameters)
            elif resource_path == '/analysis/risk':
                return risk_analysis(user_id, query_parameters)
            elif resource_path == '/analysis/benchmark':
                return benchmark_comparison(user_id, query_parameters)
            elif resource_path == '/analysis/diversification':
                return diversification_analysis(user_id, query_parameters)
            else:
                return create_response(400, {'error': f'Invalid analysis endpoint: {resource_path}'})
        
        return create_response(400, {'error': 'Invalid request method'})
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return create_response(500, {'error': f'Failed to process request: {str(e)}'})

def portfolio_performance_analysis(user_id, query_params):
    """Calculate portfolio performance metrics"""
    try:
        # Get portfolio ID from query parameters or use default
        portfolio_id = query_params.get('portfolioId', 'default')
        period = query_params.get('period', '1m')  # Default to 1 month
        
        # Get portfolio positions
        positions = get_portfolio_positions(user_id, portfolio_id)
        
        if not positions:
            return create_response(404, {'error': 'No positions found'})
        
        # Calculate time period for analysis
        end_date = datetime.now()
        
        if period == '1w':
            start_date = end_date - timedelta(days=7)
        elif period == '1m':
            start_date = end_date - timedelta(days=30)
        elif period == '3m':
            start_date = end_date - timedelta(days=90)
        elif period == '6m':
            start_date = end_date - timedelta(days=180)
        elif period == '1y':
            start_date = end_date - timedelta(days=365)
        elif period == '5y':
            start_date = end_date - timedelta(days=365*5)
        else:
            start_date = end_date - timedelta(days=30)  # Default to 1 month
        
        # For this demo, we'll generate some mock performance data
        # In a real-world scenario, you would fetch historical price data from a financial API
        performance_data = generate_mock_performance_data(positions, start_date, end_date)
        
        # Calculate performance metrics
        total_initial_value = sum(position['purchasePrice'] * position['shares'] for position in positions)
        total_current_value = sum(position['currentPrice'] * position['shares'] for position in positions)
        
        absolute_return = total_current_value - total_initial_value
        percentage_return = (absolute_return / total_initial_value) * 100 if total_initial_value > 0 else 0
        
        # Calculate additional statistics
        max_drawdown = calculate_max_drawdown(performance_data)
        volatility = calculate_volatility(performance_data)
        sharpe_ratio = calculate_sharpe_ratio(performance_data)
        
        return create_response(200, {
            'portfolioPerformance': {
                'initialValue': total_initial_value,
                'currentValue': total_current_value,
                'absoluteReturn': absolute_return,
                'percentageReturn': percentage_return,
                'maxDrawdown': max_drawdown,
                'volatility': volatility,
                'sharpeRatio': sharpe_ratio,
                'timeSeries': performance_data
            }
        })
        
    except Exception as e:
        print(f"Error in portfolio performance analysis: {str(e)}")
        return create_response(500, {'error': f'Failed to analyze portfolio performance: {str(e)}'})

def technical_indicators(user_id, query_params):
    """Calculate technical indicators for a stock"""
    try:
        ticker = query_params.get('ticker')
        if not ticker:
            return create_response(400, {'error': 'Ticker symbol is required'})
        
        # For demo purposes, generate mock price data
        price_data = generate_mock_price_data(ticker)
        
        # Calculate technical indicators
        indicators = {
            'sma': calculate_sma(price_data, 20),  # 20-day Simple Moving Average
            'ema': calculate_ema(price_data, 20),  # 20-day Exponential Moving Average
            'rsi': calculate_rsi(price_data, 14),  # 14-day Relative Strength Index
            'macd': calculate_macd(price_data),    # Moving Average Convergence Divergence
            'bollinger': calculate_bollinger_bands(price_data, 20)  # 20-day Bollinger Bands
        }
        
        return create_response(200, {
            'ticker': ticker,
            'indicators': indicators
        })
        
    except Exception as e:
        print(f"Error calculating technical indicators: {str(e)}")
        return create_response(500, {'error': f'Failed to calculate technical indicators: {str(e)}'})

def risk_analysis(user_id, query_params):
    """Perform risk analysis on the portfolio"""
    try:
        # Get portfolio ID from query parameters or use default
        portfolio_id = query_params.get('portfolioId', 'default')
        
        # Get portfolio positions
        positions = get_portfolio_positions(user_id, portfolio_id)
        
        if not positions:
            return create_response(404, {'error': 'No positions found'})
        
        # For demo purposes, generate mock correlation data and other risk metrics
        correlations = generate_mock_correlations(positions)
        
        # Calculate portfolio beta (market sensitivity)
        portfolio_beta = calculate_portfolio_beta(positions)
        
        # Calculate Value at Risk (VaR)
        value_at_risk = calculate_value_at_risk(positions)
        
        return create_response(200, {
            'riskAnalysis': {
                'correlationMatrix': correlations,
                'portfolioBeta': portfolio_beta,
                'valueAtRisk': value_at_risk,
                'riskBreakdown': {
                    'marketRisk': 65,  # Mock values
                    'sectorRisk': 20,
                    'specificRisk': 15
                }
            }
        })
        
    except Exception as e:
        print(f"Error in risk analysis: {str(e)}")
        return create_response(500, {'error': f'Failed to perform risk analysis: {str(e)}'})

def benchmark_comparison(user_id, query_params):
    """Compare portfolio performance against benchmarks"""
    try:
        # Get portfolio ID from query parameters or use default
        portfolio_id = query_params.get('portfolioId', 'default')
        benchmark = query_params.get('benchmark', 'SPY')  # Default to S&P 500 ETF
        period = query_params.get('period', '1y')  # Default to 1 year
        
        # Get portfolio positions
        positions = get_portfolio_positions(user_id, portfolio_id)
        
        if not positions:
            return create_response(404, {'error': 'No positions found'})
        
        # Calculate time period for comparison
        end_date = datetime.now()
        
        if period == '1m':
            start_date = end_date - timedelta(days=30)
        elif period == '3m':
            start_date = end_date - timedelta(days=90)
        elif period == '6m':
            start_date = end_date - timedelta(days=180)
        elif period == '1y':
            start_date = end_date - timedelta(days=365)
        elif period == '3y':
            start_date = end_date - timedelta(days=365*3)
        elif period == '5y':
            start_date = end_date - timedelta(days=365*5)
        else:
            start_date = end_date - timedelta(days=365)  # Default to 1 year
        
        # Generate mock performance data for both portfolio and benchmark
        portfolio_performance = generate_mock_performance_data(positions, start_date, end_date)
        benchmark_performance = generate_mock_benchmark_data(benchmark, start_date, end_date)
        
        # Calculate performance metrics for comparison
        portfolio_return = calculate_period_return(portfolio_performance)
        benchmark_return = calculate_period_return(benchmark_performance)
        
        tracking_error = calculate_tracking_error(portfolio_performance, benchmark_performance)
        information_ratio = calculate_information_ratio(portfolio_performance, benchmark_performance)
        
        return create_response(200, {
            'benchmarkComparison': {
                'benchmark': benchmark,
                'period': period,
                'portfolioReturn': portfolio_return,
                'benchmarkReturn': benchmark_return,
                'trackingError': tracking_error,
                'informationRatio': information_ratio,
                'alpha': portfolio_return - benchmark_return,  # Simple alpha calculation
                'portfolioTimeSeries': portfolio_performance,
                'benchmarkTimeSeries': benchmark_performance
            }
        })
        
    except Exception as e:
        print(f"Error in benchmark comparison: {str(e)}")
        return create_response(500, {'error': f'Failed to compare with benchmark: {str(e)}'})

def diversification_analysis(user_id, query_params):
    """Analyze portfolio diversification"""
    try:
        # Get portfolio ID from query parameters or use default
        portfolio_id = query_params.get('portfolioId', 'default')
        
        # Get portfolio positions
        positions = get_portfolio_positions(user_id, portfolio_id)
        
        if not positions:
            return create_response(404, {'error': 'No positions found'})
        
        # Calculate total portfolio value
        total_value = sum(position['currentPrice'] * position['shares'] for position in positions)
        
        # Analyze sector allocation (using mock sector data for this example)
        sector_allocation = analyze_sector_allocation(positions, total_value)
        
        # Analyze allocation by asset class
        asset_class_allocation = analyze_asset_class_allocation(positions, total_value)
        
        # Calculate concentration metrics
        concentration = calculate_concentration(positions, total_value)
        
        return create_response(200, {
            'diversificationAnalysis': {
                'sectorAllocation': sector_allocation,
                'assetClassAllocation': asset_class_allocation,
                'concentration': concentration,
                'diversificationScore': 75  # Mock diversification score
            }
        })
        
    except Exception as e:
        print(f"Error in diversification analysis: {str(e)}")
        return create_response(500, {'error': f'Failed to analyze diversification: {str(e)}'})

# Helper functions for calculations

def get_portfolio_positions(user_id, portfolio_id):
    """Retrieve portfolio positions from DynamoDB"""
    try:
        # Get the portfolio table and position table
        portfolio_table = dynamodb.Table(os.environ['PORTFOLIO_TABLE'])
        position_table = dynamodb.Table(os.environ['POSITION_TABLE'])
        
        # First verify the portfolio belongs to the user
        portfolio_response = portfolio_table.get_item(
            Key={
                'userId': user_id,
                'portfolioId': portfolio_id
            }
        )
        
        if 'Item' not in portfolio_response:
            print(f"Portfolio not found or does not belong to user: {user_id}, {portfolio_id}")
            # If portfolio not found, check if it's a development environment
            if os.environ.get('ENVIRONMENT') == 'development':
                print("Using mock data for development")
                return get_mock_positions()
            return []
        
        # Get positions for the portfolio
        position_response = position_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('portfolioId').eq(portfolio_id)
        )
        
        positions = position_response.get('Items', [])
        
        # For security, verify each position belongs to the correct user
        filtered_positions = [p for p in positions if p.get('userId') == user_id]
        
        # If no positions found and it's development environment, return mock data
        if not filtered_positions and os.environ.get('ENVIRONMENT') == 'development':
            print("No positions found, using mock data for development")
            return get_mock_positions()
        
        # Ensure all positions have currentPrice if not already present
        # This would be updated with real-time price data in production
        for position in filtered_positions:
            if 'currentPrice' not in position:
                # In production, this would call a stock price API
                # For now, estimate current price with a small random increase
                purchase_price = float(position.get('purchasePrice', 100))
                position['currentPrice'] = purchase_price * (1 + (np.random.random() * 0.2 - 0.05))
        
        return filtered_positions
        
    except Exception as e:
        print(f"Error retrieving positions: {str(e)}")
        # Fallback to mock data if there's an error and in development
        if os.environ.get('ENVIRONMENT') == 'development':
            print("Error occurred, using mock data for development")
            return get_mock_positions()
        # In production, propagate the error
        raise

def get_mock_positions():
    """Return mock positions for demonstration or fallback"""
    return [
        {
            'ticker': 'AAPL',
            'shares': 10,
            'purchasePrice': 150.25,
            'purchaseDate': '2023-01-15',
            'currentPrice': 175.75,
        },
        {
            'ticker': 'MSFT',
            'shares': 5,
            'purchasePrice': 305.75,
            'purchaseDate': '2023-01-20',
            'currentPrice': 364.30,
        },
        {
            'ticker': 'GOOGL',
            'shares': 2,
            'purchasePrice': 2750.00,
            'purchaseDate': '2023-02-10',
            'currentPrice': 2850.25,
        },
        {
            'ticker': 'AMZN',
            'shares': 3,
            'purchasePrice': 3300.50,
            'purchaseDate': '2023-02-15',
            'currentPrice': 3450.75,
        }
    ]

def generate_mock_performance_data(positions, start_date, end_date):
    """Generate mock performance data for demonstration purposes"""
    # In a real implementation, you would fetch historical price data from a financial API
    
    # Calculate number of days in the date range
    days = (end_date - start_date).days
    
    # Generate a series of dates
    dates = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days + 1)]
    
    # Generate portfolio values with some random fluctuation around a trend
    base_value = sum(position['shares'] * position['purchasePrice'] for position in positions)
    
    # Create a smooth trend with some randomness
    np.random.seed(42)  # For reproducibility
    trend_factor = np.linspace(0, 0.15, days + 1)  # Trending upward by 15% over the period
    random_factor = np.random.normal(0, 0.01, days + 1)  # Daily random fluctuations
    
    daily_values = [base_value * (1 + trend + random) for trend, random in zip(trend_factor, random_factor)]
    
    # Combine dates and values
    performance_data = [{"date": date, "value": value} for date, value in zip(dates, daily_values)]
    
    return performance_data

def generate_mock_price_data(ticker):
    """Generate mock price data for a stock"""
    # In a real implementation, you would fetch historical price data from a financial API
    
    # Start 100 days ago
    end_date = datetime.now()
    start_date = end_date - timedelta(days=100)
    
    # Generate dates
    dates = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(101)]
    
    # Generate prices with trend and randomness based on ticker hash
    ticker_value = sum(ord(c) for c in ticker)
    np.random.seed(ticker_value)  # Different seed for different tickers
    
    # Starting price between 50 and 500
    start_price = 50 + (ticker_value % 450)
    
    # Trend factor between -20% and +40%
    trend_direction = 1 if ticker_value % 3 != 0 else -1
    trend_magnitude = 0.2 + (ticker_value % 20) / 100
    trend_factor = np.linspace(0, trend_direction * trend_magnitude, 101)
    
    # Random daily fluctuations
    random_factor = np.random.normal(0, 0.015, 101)
    
    # Calculate daily prices
    prices = [start_price * (1 + trend + random) for trend, random in zip(trend_factor, random_factor)]
    
    # Create dataframe
    price_data = pd.DataFrame({
        'date': dates,
        'close': prices,
        'open': [price * (1 - np.random.uniform(0.005, 0.015)) for price in prices],
        'high': [price * (1 + np.random.uniform(0.005, 0.025)) for price in prices],
        'low': [price * (1 - np.random.uniform(0.010, 0.030)) for price in prices],
        'volume': [int(np.random.uniform(1000000, 10000000)) for _ in prices]
    })
    
    return price_data

def calculate_max_drawdown(performance_data):
    """Calculate maximum drawdown from a series of portfolio values"""
    values = [point['value'] for point in performance_data]
    max_dd = 0
    peak = values[0]
    
    for value in values:
        if value > peak:
            peak = value
        drawdown = (peak - value) / peak
        max_dd = max(max_dd, drawdown)
    
    return max_dd * 100  # Return as a percentage

def calculate_volatility(performance_data):
    """Calculate volatility (standard deviation of returns)"""
    values = [point['value'] for point in performance_data]
    daily_returns = [(values[i] / values[i-1]) - 1 for i in range(1, len(values))]
    
    return np.std(daily_returns) * np.sqrt(252) * 100  # Annualized, as percentage

def calculate_sharpe_ratio(performance_data):
    """Calculate Sharpe ratio (assuming risk-free rate of 2%)"""
    values = [point['value'] for point in performance_data]
    daily_returns = [(values[i] / values[i-1]) - 1 for i in range(1, len(values))]
    
    avg_return = np.mean(daily_returns)
    std_return = np.std(daily_returns)
    risk_free_daily = 0.02 / 252  # 2% annual risk-free rate converted to daily
    
    if std_return == 0:
        return 0
    
    sharpe = (avg_return - risk_free_daily) / std_return * np.sqrt(252)
    return sharpe

def calculate_sma(price_data, period):
    """Calculate Simple Moving Average"""
    closes = price_data['close'].values
    dates = price_data['date'].values[-period:]
    
    sma_values = []
    for i in range(len(closes) - period + 1):
        sma_values.append(np.mean(closes[i:i+period]))
    
    # Return just the most recent values for display
    return [{"date": date, "sma": value} for date, value in zip(dates, sma_values[-period:])]

def calculate_ema(price_data, period):
    """Calculate Exponential Moving Average"""
    closes = price_data['close'].values
    dates = price_data['date'].values[-period:]
    
    # Calculate EMA
    multiplier = 2 / (period + 1)
    ema = [closes[0]]  # Start with first price
    
    for i in range(1, len(closes)):
        ema.append(closes[i] * multiplier + ema[i-1] * (1 - multiplier))
    
    # Return just the most recent values
    return [{"date": date, "ema": value} for date, value in zip(dates, ema[-period:])]

def calculate_rsi(price_data, period):
    """Calculate Relative Strength Index"""
    closes = price_data['close'].values
    dates = price_data['date'].values[-period:]
    
    # Calculate daily price changes
    deltas = np.diff(closes)
    
    # Calculate gains and losses
    gains = np.clip(deltas, 0, float('inf'))
    losses = np.abs(np.clip(deltas, float('-inf'), 0))
    
    # Initialize avg_gain and avg_loss with simple averages
    avg_gain = np.mean(gains[:period])
    avg_loss = np.mean(losses[:period])
    
    if avg_loss == 0:
        first_rs = float('inf')
    else:
        first_rs = avg_gain / avg_loss
    
    rsi_values = [100 - (100 / (1 + first_rs))]
    
    # Calculate RSI using Wilder's smoothing method
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        
        if avg_loss == 0:
            rs = float('inf')
        else:
            rs = avg_gain / avg_loss
        
        rsi_values.append(100 - (100 / (1 + rs)))
    
    # Return just the most recent values
    return [{"date": date, "rsi": value} for date, value in zip(dates, rsi_values[-period:])]

def calculate_macd(price_data):
    """Calculate MACD (Moving Average Convergence Divergence)"""
    closes = price_data['close'].values
    dates = price_data['date'].values[-26:]  # Show last 26 days
    
    # Calculate 12-day and 26-day EMAs
    ema12 = pd.Series(closes).ewm(span=12, adjust=False).mean().values
    ema26 = pd.Series(closes).ewm(span=26, adjust=False).mean().values
    
    # Calculate MACD line
    macd_line = ema12 - ema26
    
    # Calculate signal line (9-day EMA of MACD line)
    signal_line = pd.Series(macd_line).ewm(span=9, adjust=False).mean().values
    
    # Calculate histogram
    histogram = macd_line - signal_line
    
    # Return just the most recent values
    result = []
    for i in range(-26, 0):
        result.append({
            "date": dates[i],
            "macd": macd_line[i],
            "signal": signal_line[i],
            "histogram": histogram[i]
        })
    
    return result

def calculate_bollinger_bands(price_data, period):
    """Calculate Bollinger Bands (SMA with standard deviation bands)"""
    closes = price_data['close'].values
    dates = price_data['date'].values[-period:]
    
    bollinger_values = []
    for i in range(len(closes) - period + 1):
        window = closes[i:i+period]
        sma = np.mean(window)
        std = np.std(window)
        
        bollinger_values.append({
            "sma": sma,
            "upper": sma + 2 * std,
            "lower": sma - 2 * std
        })
    
    # Return just the most recent values
    return [
        {
            "date": date,
            "middle": values["sma"],
            "upper": values["upper"],
            "lower": values["lower"]
        }
        for date, values in zip(dates, bollinger_values[-period:])
    ]

def generate_mock_correlations(positions):
    """Generate a mock correlation matrix between positions"""
    tickers = [position['ticker'] for position in positions]
    n = len(tickers)
    
    # Seed based on tickers for reproducibility
    np.random.seed(sum(ord(c) for c in ''.join(tickers)))
    
    # Generate a random correlation matrix
    # First create a random matrix
    A = np.random.randn(n, n)
    # Make it symmetric
    A = (A + A.T) / 2
    # Ensure diagonal is 1
    np.fill_diagonal(A, 1)
    
    # Ensure values are between -1 and 1
    for i in range(n):
        for j in range(n):
            if i != j:
                A[i, j] = max(-0.9, min(0.9, A[i, j]))
    
    # Format result
    correlation_matrix = []
    for i, ticker1 in enumerate(tickers):
        row = []
        for j, ticker2 in enumerate(tickers):
            row.append({
                "ticker1": ticker1,
                "ticker2": ticker2,
                "correlation": A[i, j]
            })
        correlation_matrix.append(row)
    
    return correlation_matrix

def calculate_portfolio_beta(positions):
    """Calculate mock portfolio beta (market sensitivity)"""
    # In a real implementation, you'd calculate this using regression
    # against market returns
    
    # For this demo, assign random betas to stocks and calculate weighted average
    np.random.seed(42)
    stock_betas = {
        'AAPL': 1.2,
        'MSFT': 1.1,
        'GOOGL': 1.05,
        'AMZN': 1.3,
    }
    
    # For any stocks not in our predefined list, assign a random beta
    for position in positions:
        if position['ticker'] not in stock_betas:
            stock_betas[position['ticker']] = np.random.uniform(0.8, 1.5)
    
    # Calculate total value and weighted beta
    total_value = sum(position['shares'] * position['currentPrice'] for position in positions)
    weighted_beta = sum(
        position['shares'] * position['currentPrice'] * stock_betas.get(position['ticker'], 1.0)
        for position in positions
    ) / total_value
    
    return weighted_beta

def calculate_value_at_risk(positions):
    """Calculate Value at Risk (VaR) at 95% confidence level"""
    # In a real implementation, you'd use historical returns or Monte Carlo simulation
    # For this demo, we'll use a simplified approach
    
    # Calculate portfolio value
    total_value = sum(position['shares'] * position['currentPrice'] for position in positions)
    
    # Assume a daily volatility (standard deviation) of 1.5%
    daily_volatility = 0.015
    
    # 95% confidence level corresponds to 1.645 standard deviations for a normal distribution
    confidence_factor = 1.645
    
    # Daily VaR
    daily_var = total_value * daily_volatility * confidence_factor
    
    # Return both daily and 10-day VaR (scaled by square root of time)
    return {
        "daily": daily_var,
        "tenDay": daily_var * np.sqrt(10),
        "confidenceLevel": 95,
        "portfolioValue": total_value,
        "percentageOfPortfolio": daily_var / total_value * 100
    }

def generate_mock_benchmark_data(benchmark, start_date, end_date):
    """Generate mock performance data for a benchmark"""
    # In a real implementation, you would fetch historical price data for the benchmark
    
    # Calculate number of days
    days = (end_date - start_date).days
    
    # Generate dates
    dates = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(days + 1)]
    
    # Different benchmarks will have different performances
    benchmark_value = sum(ord(c) for c in benchmark)
    np.random.seed(benchmark_value)
    
    # Base value (arbitrary starting point)
    base_value = 10000
    
    # Create a trend with randomness
    if benchmark.upper() == 'SPY':
        trend_factor = np.linspace(0, 0.12, days + 1)  # 12% trend
    elif benchmark.upper() == 'QQQ':
        trend_factor = np.linspace(0, 0.18, days + 1)  # 18% trend (tech tends to be more volatile)
    elif benchmark.upper() == 'DIA':
        trend_factor = np.linspace(0, 0.08, days + 1)  # 8% trend
    else:
        trend_factor = np.linspace(0, 0.10, days + 1)  # 10% default trend
    
    random_factor = np.random.normal(0, 0.008, days + 1)  # Daily random fluctuations
    
    daily_values = [base_value * (1 + trend + random) for trend, random in zip(trend_factor, random_factor)]
    
    # Combine dates and values
    benchmark_data = [{"date": date, "value": value} for date, value in zip(dates, daily_values)]
    
    return benchmark_data

def calculate_period_return(performance_data):
    """Calculate total return over a period"""
    first_value = performance_data[0]['value']
    last_value = performance_data[-1]['value']
    
    return ((last_value / first_value) - 1) * 100  # Return as percentage

def calculate_tracking_error(portfolio_data, benchmark_data):
    """Calculate tracking error against benchmark"""
    # Extract values
    portfolio_values = [point['value'] for point in portfolio_data]
    benchmark_values = [point['value'] for point in benchmark_data]
    
    # Calculate daily returns
    portfolio_returns = [(portfolio_values[i] / portfolio_values[i-1]) - 1 for i in range(1, len(portfolio_values))]
    benchmark_returns = [(benchmark_values[i] / benchmark_values[i-1]) - 1 for i in range(1, len(benchmark_values))]
    
    # Calculate return differences
    return_diff = [p - b for p, b in zip(portfolio_returns, benchmark_returns)]
    
    # Tracking error is the standard deviation of return differences, annualized
    tracking_error = np.std(return_diff) * np.sqrt(252) * 100  # Convert to percentage
    
    return tracking_error

def calculate_information_ratio(portfolio_data, benchmark_data):
    """Calculate information ratio (excess return / tracking error)"""
    # Calculate total returns
    portfolio_return = calculate_period_return(portfolio_data)
    benchmark_return = calculate_period_return(benchmark_data)
    
    # Calculate tracking error
    tracking_error = calculate_tracking_error(portfolio_data, benchmark_data)
    
    # Avoid division by zero
    if tracking_error == 0:
        return 0
    
    # Information ratio is excess return divided by tracking error
    return (portfolio_return - benchmark_return) / tracking_error

def analyze_sector_allocation(positions, total_value):
    """Analyze sector allocation of portfolio"""
    # In a real implementation, you would look up the sector for each ticker
    # For this demo, we'll use mock sector data
    
    # Mock sector mapping
    sector_mapping = {
        'AAPL': 'Technology',
        'MSFT': 'Technology',
        'GOOGL': 'Technology',
        'AMZN': 'Consumer Cyclical',
        'FB': 'Technology',
        'TSLA': 'Automotive',
        'JPM': 'Financial Services',
        'V': 'Financial Services',
        'JNJ': 'Healthcare',
        'WMT': 'Consumer Defensive',
        'PG': 'Consumer Defensive',
        'XOM': 'Energy',
        'BAC': 'Financial Services',
        'HD': 'Consumer Cyclical',
        'INTC': 'Technology',
        'VZ': 'Communication Services',
        'T': 'Communication Services',
        'NFLX': 'Communication Services',
        'CSCO': 'Technology',
        'PFE': 'Healthcare'
    }
    
    # Default sector for unknown tickers
    default_sector = 'Other'
    
    # Calculate value by sector
    sector_values = {}
    for position in positions:
        ticker = position['ticker']
        position_value = position['shares'] * position['currentPrice']
        sector = sector_mapping.get(ticker, default_sector)
        
        if sector in sector_values:
            sector_values[sector] += position_value
        else:
            sector_values[sector] = position_value
    
    # Calculate percentages
    sector_allocation = [
        {
            'sector': sector,
            'value': value,
            'percentage': (value / total_value) * 100
        }
        for sector, value in sector_values.items()
    ]
    
    # Sort by percentage (descending)
    sector_allocation.sort(key=lambda x: x['percentage'], reverse=True)
    
    return sector_allocation

def analyze_asset_class_allocation(positions, total_value):
    """Analyze asset class allocation of portfolio"""
    # In a real implementation, you would look up the asset class for each ticker
    # For this demo, we'll use mock asset class data
    
    # Mock asset class mapping
    asset_class_mapping = {
        'AAPL': 'Stocks',
        'MSFT': 'Stocks',
        'GOOGL': 'Stocks',
        'AMZN': 'Stocks',
        'FB': 'Stocks',
        'TSLA': 'Stocks',
        'JPM': 'Stocks',
        'V': 'Stocks',
        'JNJ': 'Stocks',
        'WMT': 'Stocks',
        'PG': 'Stocks',
        'XOM': 'Stocks',
        'BAC': 'Stocks',
        'HD': 'Stocks',
        'INTC': 'Stocks',
        'VZ': 'Stocks',
        'T': 'Stocks',
        'NFLX': 'Stocks',
        'CSCO': 'Stocks',
        'PFE': 'Stocks',
        'AGG': 'Bonds',
        'BND': 'Bonds',
        'LQD': 'Bonds',
        'TLT': 'Bonds',
        'SHY': 'Bonds',
        'GLD': 'Commodities',
        'SLV': 'Commodities',
        'VNQ': 'Real Estate'
    }
    
    # Default asset class for unknown tickers
    default_asset_class = 'Other'
    
    # Calculate value by asset class
    asset_class_values = {}
    for position in positions:
        ticker = position['ticker']
        position_value = position['shares'] * position['currentPrice']
        asset_class = asset_class_mapping.get(ticker, default_asset_class)
        
        if asset_class in asset_class_values:
            asset_class_values[asset_class] += position_value
        else:
            asset_class_values[asset_class] = position_value
    
    # Calculate percentages
    asset_class_allocation = [
        {
            'assetClass': asset_class,
            'value': value,
            'percentage': (value / total_value) * 100
        }
        for asset_class, value in asset_class_values.items()
    ]
    
    # Sort by percentage (descending)
    asset_class_allocation.sort(key=lambda x: x['percentage'], reverse=True)
    
    return asset_class_allocation

def calculate_concentration(positions, total_value):
    """Calculate portfolio concentration metrics"""
    # Calculate percentage of each position
    position_percentages = [
        (position['shares'] * position['currentPrice'] / total_value) * 100
        for position in positions
    ]
    
    # Sort percentages in descending order
    position_percentages.sort(reverse=True)
    
    # Calculate concentration metrics
    top_holding_percentage = position_percentages[0] if position_percentages else 0
    top_3_percentage = sum(position_percentages[:3]) if len(position_percentages) >= 3 else sum(position_percentages)
    top_5_percentage = sum(position_percentages[:5]) if len(position_percentages) >= 5 else sum(position_percentages)
    
    # Calculate Herfindahl-Hirschman Index (HHI) - a measure of concentration
    hhi = sum([(p / 100) ** 2 for p in position_percentages]) * 10000
    
    return {
        'topHolding': top_holding_percentage,
        'top3Holdings': top_3_percentage,
        'top5Holdings': top_5_percentage,
        'hhi': hhi,
        'numberOfPositions': len(positions)
    }

def create_response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
            'Access-Control-Allow-Credentials': 'true'
        },
        'body': json.dumps(body, default=decimal_default)
    }