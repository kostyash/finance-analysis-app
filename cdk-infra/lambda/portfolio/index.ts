// Add these imports at the top of your cdk-infra/lambda/portfolio/index.ts file
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import * as busboy from "busboy";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";

// If you're using TypeScript, add these type definitions
interface YahooFinanceSearchResult {
  quotes?: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    quoteType: string;
    score?: number;
  }>;
}

interface YahooFinanceQuoteResult {
  quoteResponse?: {
    result?: Array<{
      symbol: string;
      regularMarketPrice: number;
      regularMarketChange: number;
      regularMarketChangePercent: number;
      shortName?: string;
      longName?: string;
      currency: string;
      fullExchangeName: string;
    }>;
  };
}

// Types for import data handling
interface ImportPosition {
  ticker: string;
  companyName?: string;
  shares: number;
  purchasePrice: number;
  purchaseDate: string;
  currentPrice?: number;
  notes?: string;
}

interface ImportResults {
  totalPositions: number;
  validPositions: number;
  addedPositions: number;
  errors: number;
  warnings: string[];
}

interface EnrichmentResult {
  enrichedPositions: ImportPosition[];
  importResults: ImportResults;
}

// Excel row data type
interface ExcelRow {
  [key: string]: any;
}

const dynamoDB = new DynamoDB.DocumentClient();
const PORTFOLIO_TABLE = process.env.PORTFOLIO_TABLE!;
const POSITION_TABLE = process.env.POSITION_TABLE!;

// Helper function to check if a portfolio exists and belongs to a user
async function checkPortfolioExists(
  userId: string,
  portfolioId: string
): Promise<boolean> {
  try {
    const params = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    const result = await dynamoDB.get(params).promise();
    return !!result.Item; // Convert to boolean - true if Item exists, false otherwise
  } catch (error) {
    console.error("Error checking if portfolio exists:", error);
    return false; // Assume portfolio doesn't exist if there's an error
  }
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Get user ID from Cognito authorizer context
    const userId = event.requestContext.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: "User not authenticated" }),
      };
    }

    // Parse HTTP method and path parameters
    const method = event.httpMethod;
    const portfolioId = event.pathParameters?.portfolioId || "default";

    // Handle different operations based on method and path
    switch (method) {
      case "GET":
        if (event.path.endsWith("/portfolio")) {
          // Get all portfolios for a user
          return await getPortfolios(userId);
        } else if (event.path.includes("/positions")) {
          // Get positions for a specific portfolio
          return await getPositions(userId, portfolioId);
        } else if (event.resource === "/portfolio/{portfolioId}") {
          // Get specific portfolio details
          return await getPortfolioDetails(userId, portfolioId);
        }
        break;

      case "POST":
        if (event.path.endsWith("/portfolio")) {
          // Create a new portfolio
          const portfolio = JSON.parse(event.body || "{}");
          return await createPortfolio(userId, portfolio);
        } else if (event.path.includes("/positions")) {
          // Add a new position
          const position = JSON.parse(event.body || "{}");
          return await addPosition(userId, portfolioId, position);
        } else if (event.path.includes("/import")) {
          // Handle file import
          return await importPortfolioData(userId, portfolioId, event);
        }
        break;

      case "PUT":
        if (event.resource === "/portfolio/{portfolioId}") {
          // Update portfolio details
          const portfolioUpdates = JSON.parse(event.body || "{}");
          return await updatePortfolio(userId, portfolioId, portfolioUpdates);
        } else if (event.path.includes("/positions")) {
          // Update a position
          const ticker = event.pathParameters?.ticker;
          const position = JSON.parse(event.body || "{}");
          if (ticker) {
            return await updatePosition(userId, portfolioId, ticker, position);
          }
        }
        break;

      case "DELETE":
        if (event.resource === "/portfolio/{portfolioId}") {
          // Delete a portfolio
          return await deletePortfolio(userId, portfolioId);
        } else if (event.path.includes("/positions")) {
          // Delete a position
          const ticker = event.pathParameters?.ticker;
          if (ticker) {
            return await deletePosition(userId, portfolioId, ticker);
          }
        }
        break;

      case "OPTIONS":
        // Handle CORS preflight requests
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
          },
          body: "",
        };
    }

    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Invalid request" }),
    };
  } catch (error) {
    console.error("Error processing request:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to process request" }),
    };
  }
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": "true",
  "Content-Type": "application/json",
};

// Get all portfolios for a user
async function getPortfolios(userId: string) {
  try {
    const params = {
      TableName: PORTFOLIO_TABLE,
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    };

    const result = await dynamoDB.query(params).promise();

    // If no portfolios exist, create a default one
    if (!result.Items || result.Items.length === 0) {
      const defaultPortfolio = {
        userId: userId,
        portfolioId: "default",
        name: "Default Portfolio",
        description: "Your default investment portfolio",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dynamoDB
        .put({
          TableName: PORTFOLIO_TABLE,
          Item: defaultPortfolio,
        })
        .promise();

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify([defaultPortfolio]),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error("Error getting portfolios:", error);
    throw error;
  }
}

// Get specific portfolio details
async function getPortfolioDetails(userId: string, portfolioId: string) {
  try {
    // Use the checkPortfolioExists function
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (!portfolioExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

    const params = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    const result = await dynamoDB.get(params).promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    console.error("Error getting portfolio details:", error);
    throw error;
  }
}

// Create a new portfolio
async function createPortfolio(userId: string, portfolioData: any) {
  try {
    // Generate a UUID for the portfolio if not provided
    const portfolioId = portfolioData.portfolioId || uuidv4();

    // Check if the portfolio already exists
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (portfolioExists) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Portfolio already exists with this ID",
        }),
      };
    }

    // Create portfolio object with required fields
    const portfolio = {
      userId: userId,
      portfolioId: portfolioId,
      name: portfolioData.name || "New Portfolio",
      description: portfolioData.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add any other fields from portfolioData
      ...Object.fromEntries(
        Object.entries(portfolioData).filter(
          ([key]) =>
            !["userId", "portfolioId", "createdAt", "updatedAt"].includes(key)
        )
      ),
    };

    const params = {
      TableName: PORTFOLIO_TABLE,
      Item: portfolio,
    };

    await dynamoDB.put(params).promise();

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(portfolio),
    };
  } catch (error) {
    console.error("Error creating portfolio:", error);
    throw error;
  }
}

// Update portfolio details
async function updatePortfolio(
  userId: string,
  portfolioId: string,
  updates: any
) {
  try {
    // Check if the portfolio exists and belongs to the user
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (!portfolioExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

    // Update portfolio logic
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Always update the updatedAt timestamp
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    Object.keys(updates).forEach((key) => {
      if (key !== "userId" && key !== "portfolioId" && key !== "createdAt") {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = updates[key];
      }
    });

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No valid fields to update" }),
      };
    }

    const params = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDB.update(params).promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error("Error updating portfolio:", error);
    throw error;
  }
}

// Delete a portfolio and all its positions
async function deletePortfolio(userId: string, portfolioId: string) {
  try {
    // Check if portfolio exists and belongs to user
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (!portfolioExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

    // Prevent deletion of the default portfolio
    if (portfolioId === "default") {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Cannot delete the default portfolio" }),
      };
    }

    // Delete the portfolio
    const deleteParams = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    await dynamoDB.delete(deleteParams).promise();

    // Find and delete all positions in this portfolio
    // Note: For large portfolios, you might want to use batch operations
    const positionParams = {
      TableName: POSITION_TABLE,
      KeyConditionExpression: "portfolioId = :portfolioId",
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":portfolioId": portfolioId,
        ":userId": userId,
      },
    };

    const positions = await dynamoDB.query(positionParams).promise();

    // Delete each position
    if (positions.Items && positions.Items.length > 0) {
      const deletePromises = positions.Items.map((position) => {
        return dynamoDB
          .delete({
            TableName: POSITION_TABLE,
            Key: {
              portfolioId: portfolioId,
              ticker: position.ticker,
            },
          })
          .promise();
      });

      await Promise.all(deletePromises);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Portfolio deleted successfully",
        deletedPositions: positions.Items?.length || 0,
      }),
    };
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    throw error;
  }
}

// Enhanced importPortfolioData function with Yahoo Finance API integration
async function importPortfolioData(
  userId: string,
  portfolioId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Check if portfolio exists
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (!portfolioExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

    // Parse the body content
    const body = event.body || "";
    const contentType = event.headers["content-type"] || "";
    console.log("Content-Type:", contentType);

    // For HTML-based Excel files
    if (body.includes("<table>") || body.includes("<html")) {
      return handleHtmlImport(userId, portfolioId, body);
    }
    // For Excel files (binary)
    else if (
      contentType.includes("application/vnd.openxmlformats") ||
      contentType.includes("application/vnd.ms-excel") ||
      contentType.includes("multipart/form-data")
    ) {
      return handleExcelImport(userId, portfolioId, body, contentType, event);
    }
    // For CSV files
    else if (contentType.includes("text/csv") || body.includes(",")) {
      return handleCsvImport(userId, portfolioId, body);
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Unsupported file format",
          details:
            "Please upload an Excel file (.xlsx, .xls), CSV, or an HTML table.",
        }),
      };
    }
  } catch (error) {
    console.error("Error importing portfolio data:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to import portfolio data" }),
    };
  }
}

// Handle HTML table imports
async function handleHtmlImport(
  userId: string,
  portfolioId: string,
  body: string
) {
  const positions = [];

  // Extract rows from the HTML table
  const rows =
    body.match(/<tr><td\s+style='border: 1px solid #000[^>]*>.*?<\/tr>/g) || [];

  for (const row of rows) {
    // Extract cell values
    const cells = row.match(/<td[^>]*>(.*?)<\/td>/g) || [];
    const cellValues = cells.map((cell) => {
      const match = cell.match(/<td[^>]*>(.*?)<\/td>/);
      return match ? match[1] : "";
    });

    if (cellValues.length >= 4) {
      // Map to position format
      const ticker = cellValues[1]; // Security Name or ticker
      const purchasePrice = parseFloat(cellValues[2]); // Avg Buy Rate
      const shares = parseFloat(cellValues[3]); // Holdings Quantity

      if (ticker && !isNaN(shares) && !isNaN(purchasePrice) && shares > 0) {
        positions.push({
          ticker,
          shares,
          purchasePrice,
          purchaseDate: new Date().toISOString().split("T")[0],
          notes: `Imported from HTML table on ${new Date().toLocaleDateString()}`,
        });
      }
    }
  }

  // Validate and enrich positions with Yahoo Finance data
  const enrichedPositions = await enrichPositionsWithYahooFinance(positions);

  // Add to database
  return saveImportedPositions(userId, portfolioId, enrichedPositions);
}

// Handle Excel file imports
async function handleExcelImport(
  userId: string,
  portfolioId: string,
  body: string,
  contentType: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    let positions: ImportPosition[] = [];

    // For multipart form data (file upload through browser)
    if (contentType.includes("multipart/form-data")) {
      const fileBuffer = await parseMultipartFormData(event);

      if (!fileBuffer) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: "No file found in request" }),
        };
      }

      // Read the Excel workbook
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });

      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      // Use processExcelData here to extract positions from the Excel data
      positions = processExcelData(data);
    }
    // For direct Excel binary data (API calls)
    else if (
      contentType.includes("application/vnd.openxmlformats") ||
      contentType.includes("application/vnd.ms-excel")
    ) {
      const buffer = Buffer.from(body, "base64");

      // Read the Excel workbook
      const workbook = XLSX.read(buffer, { type: "buffer" });

      // Get the first worksheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      // Use processExcelData here to extract positions from the Excel data
      positions = processExcelData(data);
    }

    // Validate and enrich positions with Yahoo Finance data
    const { enrichedPositions, importResults } =
      await enrichPositionsWithYahooFinance(positions);

    // Add to database
    return saveImportedPositions(userId, portfolioId, {
      enrichedPositions,
      importResults,
    });
  } catch (error) {
    console.error("Error processing Excel file:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Failed to process Excel file",
        details: (error as Error).message,
      }),
    };
  }
}

/**
 * Parse multipart form data from API Gateway event
 * This function extracts file content from multipart/form-data requests
 */
async function parseMultipartFormData(
  event: APIGatewayProxyEvent
): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    const contentType =
      event.headers["content-type"] || event.headers["Content-Type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      reject(new Error("Not a multipart/form-data request"));
      return;
    }

    // Extract boundary from content type
    const boundary = contentType.split("boundary=")[1]?.split(";")[0];

    if (!boundary) {
      reject(new Error("No boundary found in multipart/form-data"));
      return;
    }

    let fileBuffer: Buffer | null = null;

    const bb = busboy({ headers: { "content-type": contentType } });

    bb.on("file", (_, file, info) => {
      const chunks: Buffer[] = [];

      file.on("data", (chunk) => {
        chunks.push(chunk);
      });

      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    bb.on("finish", () => {
      resolve(fileBuffer);
    });

    bb.on("error", (error) => {
      reject(error);
    });

    // Handle the event body - may be Base64 encoded
    const body = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : event.body;

    bb.write(body);
    bb.end();
  });
}

// Process Excel row data with proper typing
function processExcelData(data: ExcelRow[]): ImportPosition[] {
  const positions: ImportPosition[] = [];

  // Process each row
  for (const row of data) {
    // Try different possible column names for ticker/symbol
    const ticker =
      (row.Symbol as string) ||
      (row.Ticker as string) ||
      (row["Stock Symbol"] as string) ||
      (row.Security as string) ||
      (row["Security Name"] as string) ||
      "";

    const companyName =
      (row.Company as string) ||
      (row.Name as string) ||
      (row["Company Name"] as string) ||
      (row.Description as string) ||
      "";

    const shares = parseFloat(
      (row.Shares as string) ||
        (row.Quantity as string) ||
        (row["Holdings Quantity"] as string) ||
        (row.Amount as string) ||
        (row.Units as string) ||
        "0"
    );

    const purchasePrice = parseFloat(
      (row["Purchase Price"] as string) ||
        (row["Avg Buy Rate"] as string) ||
        (row.Price as string) ||
        (row.Cost as string) ||
        (row["Cost/Share"] as string) ||
        "0"
    );

    const purchaseDateStr =
      (row["Purchase Date"] as string) ||
      (row.Date as string) ||
      new Date().toISOString().split("T")[0];

    // Only add if basic required data is present
    if ((ticker || companyName) && !isNaN(shares) && shares > 0) {
      positions.push({
        ticker: ticker.trim(),
        companyName: companyName ? companyName.trim() : undefined,
        shares,
        purchasePrice: !isNaN(purchasePrice) ? purchasePrice : 0,
        purchaseDate: purchaseDateStr,
        notes: `Imported from Excel on ${new Date().toLocaleDateString()}`,
      });
    }
  }

  return positions;
}

// Handle CSV imports
async function handleCsvImport(
  userId: string,
  portfolioId: string,
  body: string
) {
  let positions = [];

  // Split by line breaks
  const lines = body.split(/\r?\n/);

  // Extract header row
  const header = lines[0].split(",");

  // Map header indices
  const tickerIndex = header.findIndex((col) =>
    /symbol|ticker|security|stock/i.test(col)
  );
  const companyIndex = header.findIndex((col) =>
    /company|name|description/i.test(col)
  );
  const sharesIndex = header.findIndex((col) =>
    /shares|quantity|amount|units/i.test(col)
  );
  const priceIndex = header.findIndex((col) => /price|cost|rate/i.test(col));
  const dateIndex = header.findIndex((col) => /date|purchased/i.test(col));

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(",");

    const ticker = tickerIndex >= 0 ? values[tickerIndex].trim() : "";
    const companyName = companyIndex >= 0 ? values[companyIndex].trim() : "";
    const shares = sharesIndex >= 0 ? parseFloat(values[sharesIndex]) : 0;
    const purchasePrice = priceIndex >= 0 ? parseFloat(values[priceIndex]) : 0;
    const purchaseDate =
      dateIndex >= 0
        ? values[dateIndex].trim()
        : new Date().toISOString().split("T")[0];

    // If basic required data is present
    if ((ticker || companyName) && !isNaN(shares) && shares > 0) {
      positions.push({
        ticker,
        companyName,
        shares,
        purchasePrice: !isNaN(purchasePrice) ? purchasePrice : 0,
        purchaseDate,
        notes: `Imported from CSV on ${new Date().toLocaleDateString()}`,
      });
    }
  }

  // Validate and enrich positions with Yahoo Finance data
  const enrichedPositions = await enrichPositionsWithYahooFinance(positions);

  // Add to database
  return saveImportedPositions(userId, portfolioId, enrichedPositions);
}

// Enrich positions with Yahoo Finance data
async function enrichPositionsWithYahooFinance(
  positions: ImportPosition[]
): Promise<EnrichmentResult> {
  const enrichedPositions: ImportPosition[] = [];
  const importResults: ImportResults = {
    totalPositions: positions.length,
    validPositions: 0,
    addedPositions: 0,
    errors: 0,
    warnings: [],
  };

  for (const position of positions) {
    try {
      let ticker = position.ticker;
      let currentPrice = 0;
      let lookupMethod = "direct";

      // If ticker is missing but company name is present, look up by company name
      if (!ticker && position.companyName) {
        const tickerInfo = await lookupTickerByCompanyName(
          position.companyName
        );
        if (tickerInfo && tickerInfo.symbol) {
          ticker = tickerInfo.symbol;
          position.ticker = ticker;
          lookupMethod = "company_name";
          importResults.warnings.push(
            `Looked up ticker ${ticker} for company "${position.companyName}"`
          );
        } else {
          importResults.warnings.push(
            `Could not find ticker for company "${position.companyName}"`
          );
          importResults.errors++;
          continue; // Skip this position
        }
      }

      // Validate and get current price for the ticker
      if (ticker) {
        const stockData = await getYahooFinanceStockData(ticker);

        if (stockData && stockData.price) {
          currentPrice = stockData.price;

          // If purchase price is missing or zero, use current price
          if (!position.purchasePrice || position.purchasePrice === 0) {
            position.purchasePrice = currentPrice;
            importResults.warnings.push(
              `Used current price for ${ticker} as purchase price was missing`
            );
          }

          importResults.validPositions++;
        } else {
          importResults.warnings.push(`Could not validate ticker ${ticker}`);
          // We'll still try to add the position with the data we have
        }
      } else {
        importResults.warnings.push(
          `Position missing both ticker and company name`
        );
        importResults.errors++;
        continue; // Skip this position
      }

      enrichedPositions.push({
        ticker,
        shares: position.shares,
        purchasePrice: position.purchasePrice,
        purchaseDate: position.purchaseDate,
        currentPrice: currentPrice || position.purchasePrice,
        notes:
          position.notes +
          (lookupMethod === "company_name"
            ? ` (Ticker looked up from "${position.companyName}")`
            : ""),
      });
    } catch (error) {
      console.error(
        `Error processing position ${position.ticker || position.companyName}:`,
        error
      );
      importResults.errors++;
    }
  }

  return { enrichedPositions, importResults };
}

// Look up ticker by company name using Yahoo Finance
interface TickerInfo {
  symbol: string;
  name?: string;
  exchange?: string;
  score?: number;
}

// Look up ticker by company name using Yahoo Finance
async function lookupTickerByCompanyName(
  companyName: string
): Promise<TickerInfo | null> {
  try {
    const encodedName = encodeURIComponent(companyName);
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodedName}&quotesCount=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        Referer: "https://finance.yahoo.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned status ${response.status}`);
    }

    const data = (await response.json()) as YahooFinanceSearchResult;

    // Check if the response contains the expected structure
    if (data.quotes && Array.isArray(data.quotes)) {
      // Find the first equity result
      const equity = data.quotes.find((quote) => quote.quoteType === "EQUITY");

      if (equity) {
        return {
          symbol: equity.symbol,
          name: equity.shortname || equity.longname,
          exchange: equity.exchange,
          score: equity.score,
        };
      }

      // If no equity found, try ETFs
      const etf = data.quotes.find((quote) => quote.quoteType === "ETF");
      if (etf) {
        return {
          symbol: etf.symbol,
          name: etf.shortname || etf.longname,
          exchange: etf.exchange,
          score: etf.score,
        };
      }
    } else {
      console.error("Unexpected response format:", data);
    }

    return null;
  } catch (error) {
    console.error("Error looking up ticker by company name:", error);
    return null;
  }
}

// Get stock data from Yahoo Finance
interface StockData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  name?: string;
  currency?: string;
  exchange?: string;
}

// Get stock data from Yahoo Finance
async function getYahooFinanceStockData(
  ticker: string
): Promise<StockData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      ticker
    )}&quotesCount=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "max-age=0",
        Referer: "https://finance.yahoo.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API returned status ${response.status}`);
    }

    const data = (await response.json()) as YahooFinanceQuoteResult;
    const quote = data.quoteResponse?.result?.[0];

    if (quote) {
      return {
        symbol: quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        name: quote.shortName || quote.longName,
        currency: quote.currency,
        exchange: quote.fullExchangeName,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return null;
  }
}

// Save the enriched positions to the database
async function saveImportedPositions(
  userId: string,
  portfolioId: string,
  { enrichedPositions, importResults }: EnrichmentResult
): Promise<APIGatewayProxyResult> {
  try {
    // Add each position to the database
    for (const position of enrichedPositions) {
      try {
        await dynamoDB
          .put({
            TableName: POSITION_TABLE,
            Item: {
              userId: userId,
              portfolioId: portfolioId,
              ticker: position.ticker,
              shares: position.shares,
              purchasePrice: position.purchasePrice,
              purchaseDate: position.purchaseDate,
              currentPrice: position.currentPrice,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              notes: position.notes,
            },
            // Only add if it doesn't already exist (to prevent overwriting)
            ConditionExpression:
              "attribute_not_exists(portfolioId) OR attribute_not_exists(ticker)",
          })
          .promise();

        importResults.addedPositions++;
      } catch (error: any) {
        // Type assertion for error
        if (error.code === "ConditionalCheckFailedException") {
          importResults.warnings.push(
            `Position for ${position.ticker} already exists in portfolio`
          );
        } else {
          console.error("Error adding position:", error);
          importResults.errors++;
        }
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Portfolio data imported successfully",
        results: importResults,
      }),
    };
  } catch (error) {
    console.error("Error saving imported positions:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to save imported positions" }),
    };
  }
}

async function getPositions(userId: string, portfolioId: string) {
  try {
    // Check if portfolio exists and belongs to user
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (!portfolioExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

    const params = {
      TableName: POSITION_TABLE,
      KeyConditionExpression: "portfolioId = :portfolioId",
      FilterExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":portfolioId": portfolioId,
        ":userId": userId,
      },
    };

    const result = await dynamoDB.query(params).promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error("Error getting positions:", error);
    throw error;
  }
}

// Add position function
async function addPosition(userId: string, portfolioId: string, position: any) {
  try {
    // Verify the portfolio exists and belongs to the user
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (!portfolioExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

    // Basic validation
    if (!position.ticker || !position.shares) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Ticker and shares are required" }),
      };
    }

    // Validate numeric fields
    if (
      isNaN(Number(position.shares)) ||
      isNaN(Number(position.purchasePrice))
    ) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Shares and purchase price must be valid numbers",
        }),
      };
    }

    // Check if position already exists
    const existingPositionParams = {
      TableName: POSITION_TABLE,
      Key: {
        portfolioId: portfolioId,
        ticker: position.ticker,
      },
    };

    const existingPosition = await dynamoDB
      .get(existingPositionParams)
      .promise();

    if (existingPosition.Item) {
      return {
        statusCode: 409,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Position already exists with this ticker in this portfolio",
          message: "Use PUT to update an existing position",
        }),
      };
    }

    // Add userId and timestamp to the position for tracking
    position.userId = userId;
    position.portfolioId = portfolioId;
    position.createdAt = new Date().toISOString();
    position.updatedAt = new Date().toISOString();

    // Add a mock current price if not provided
    if (!position.currentPrice) {
      position.currentPrice =
        position.purchasePrice * (1 + (Math.random() * 0.2 - 0.1));
    }

    // Ensure numeric fields are actually numbers
    position.shares = Number(position.shares);
    position.purchasePrice = Number(position.purchasePrice);
    position.currentPrice = Number(position.currentPrice);

    const params = {
      TableName: POSITION_TABLE,
      Item: position,
    };

    await dynamoDB.put(params).promise();

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(position),
    };
  } catch (error) {
    console.error("Error adding position:", error);
    throw error;
  }
}

// Update position function
async function updatePosition(
  userId: string,
  portfolioId: string,
  ticker: string,
  updates: any
) {
  try {
    // First check that the portfolio exists
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (!portfolioExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

    // Then check that the position exists and belongs to the user
    const getParams = {
      TableName: POSITION_TABLE,
      Key: {
        portfolioId: portfolioId,
        ticker: ticker,
      },
    };

    const existingItem = await dynamoDB.get(getParams).promise();

    if (!existingItem.Item || existingItem.Item.userId !== userId) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Position not found or not authorized" }),
      };
    }

    // Validate numeric fields
    if (updates.shares && isNaN(Number(updates.shares))) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Shares must be a valid number" }),
      };
    }

    if (updates.purchasePrice && isNaN(Number(updates.purchasePrice))) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Purchase price must be a valid number",
        }),
      };
    }

    // Update position logic
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Always update the updatedAt timestamp
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    // Process each update field
    Object.keys(updates).forEach((key) => {
      if (
        key !== "portfolioId" &&
        key !== "ticker" &&
        key !== "userId" &&
        key !== "createdAt"
      ) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;

        // Ensure numeric values are stored as numbers
        if (key === "shares" || key === "purchasePrice") {
          expressionAttributeValues[`:${key}`] = Number(updates[key]);
        } else {
          expressionAttributeValues[`:${key}`] = updates[key];
        }
      }
    });

    // If shares or purchasePrice was updated, update currentPrice as a mock
    if (updates.shares || updates.purchasePrice) {
      const currentPurchasePrice =
        updates.purchasePrice || existingItem.Item.purchasePrice;
      const mockCurrentPrice =
        currentPurchasePrice * (1 + (Math.random() * 0.2 - 0.1));

      updateExpressions.push("#currentPrice = :currentPrice");
      expressionAttributeNames["#currentPrice"] = "currentPrice";
      expressionAttributeValues[":currentPrice"] = mockCurrentPrice;
    }

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "No valid fields to update" }),
      };
    }

    const params = {
      TableName: POSITION_TABLE,
      Key: {
        portfolioId: portfolioId,
        ticker: ticker,
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDB.update(params).promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    console.error("Error updating position:", error);
    throw error;
  }
}

// Delete position function
async function deletePosition(
  userId: string,
  portfolioId: string,
  ticker: string
) {
  try {
    // Check that the portfolio exists
    const portfolioExists = await checkPortfolioExists(userId, portfolioId);
    if (!portfolioExists) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

    // Check that the position exists and belongs to the user
    const getParams = {
      TableName: POSITION_TABLE,
      Key: {
        portfolioId: portfolioId,
        ticker: ticker,
      },
    };

    const existingItem = await dynamoDB.get(getParams).promise();

    if (!existingItem.Item || existingItem.Item.userId !== userId) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Position not found or not authorized" }),
      };
    }

    const params = {
      TableName: POSITION_TABLE,
      Key: {
        portfolioId: portfolioId,
        ticker: ticker,
      },
    };

    await dynamoDB.delete(params).promise();

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: "Position deleted successfully" }),
    };
  } catch (error) {
    console.error("Error deleting position:", error);
    throw error;
  }
}
