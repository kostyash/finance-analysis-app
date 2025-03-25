import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const dynamoDB = new DynamoDB.DocumentClient();
const PORTFOLIO_TABLE = process.env.PORTFOLIO_TABLE!;
const POSITION_TABLE = process.env.POSITION_TABLE!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log("Table names:", {
      portfolioTable: PORTFOLIO_TABLE,
      positionTable: POSITION_TABLE,
    });
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
    const params = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    const result = await dynamoDB.get(params).promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Portfolio not found" }),
      };
    }

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

    // First check if the portfolio already exists
    const getParams = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    const existingItem = await dynamoDB.get(getParams).promise();

    if (existingItem.Item) {
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
    // First check that the portfolio exists and belongs to the user
    const getParams = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    const existingItem = await dynamoDB.get(getParams).promise();

    if (!existingItem.Item) {
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
    const getParams = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    const existingItem = await dynamoDB.get(getParams).promise();

    if (!existingItem.Item) {
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

async function getPositions(userId: string, portfolioId: string) {
  try {
    // First verify that the portfolio belongs to the user
    const portfolioParams = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    const portfolioResult = await dynamoDB.get(portfolioParams).promise();

    if (!portfolioResult.Item) {
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

// Add position function (continued)
async function addPosition(userId: string, portfolioId: string, position: any) {
  try {
    // Verify the portfolio exists and belongs to the user
    const portfolioParams = {
      TableName: PORTFOLIO_TABLE,
      Key: {
        userId: userId,
        portfolioId: portfolioId,
      },
    };

    const portfolioResult = await dynamoDB.get(portfolioParams).promise();

    if (!portfolioResult.Item) {
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
    // First check that the position exists and belongs to the user
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
    // First check that the position exists and belongs to the user
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
