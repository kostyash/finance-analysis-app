import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";

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

async function importPortfolioData(
  userId: string,
  portfolioId: string,
  event: APIGatewayProxyEvent
) {
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
    console.log("Content-Type:", event.headers["content-type"]);

    // For HTML-based Excel files
    if (body.includes("<table>") || body.includes("<html")) {
      // Use cheerio or a similar library to parse HTML
      // For simplicity, let's extract data using regex
      const positions = [];

      // Extract rows from the HTML table
      const tableRowRegex =
        /<tr><td[^>]*>(\d+)<\/td><td[^>]*>([^<]+)<\/td><td[^>]*>([\d\.]+)<\/td><td[^>]*>(\d+)<\/td>/g;
      let match;

      // Process each row we can find
      const securityIdIndex = 0;
      const securityNameIndex = 1;
      const avgBuyRateIndex = 2;
      const holdingsQuantityIndex = 3;

      // Try to extract position data from HTML
      const rows =
        body.match(/<tr><td\s+style='border: 1px solid #000[^>]*>.*?<\/tr>/g) ||
        [];

      for (const row of rows) {
        // Extract cell values
        const cells = row.match(/<td[^>]*>(.*?)<\/td>/g) || [];
        const cellValues = cells.map((cell) => {
          const match = cell.match(/<td[^>]*>(.*?)<\/td>/);
          return match ? match[1] : "";
        });

        if (cellValues.length >= 4) {
          // Map to position format
          const ticker = cellValues[1]; // Security Name
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

      // If no positions found, return error
      if (positions.length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "No valid positions found in the uploaded file",
            details:
              "Could not parse any valid positions from the HTML content",
          }),
        };
      }

      // Add positions to the database
      const importResults = {
        totalPositions: positions.length,
        validPositions: positions.length,
        addedPositions: 0,
        errors: 0,
      };

      // Add each position to the database
      for (const position of positions) {
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
                currentPrice:
                  position.purchasePrice * (1 + (Math.random() * 0.2 - 0.1)),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                notes: position.notes,
              },
              ConditionExpression:
                "attribute_not_exists(portfolioId) OR attribute_not_exists(ticker)",
            })
            .promise();

          importResults.addedPositions++;
        } catch (error) {
          console.error("Error adding position:", error);
          importResults.errors++;
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: "Portfolio data imported successfully from HTML",
          results: importResults,
        }),
      };
    }

    // Handle rest of function for other file types...
    // ... (keep your existing code for Excel files)
  } catch (error) {
    console.error("Error importing portfolio data:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Failed to import portfolio data" }),
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
