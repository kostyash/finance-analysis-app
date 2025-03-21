import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const dynamoDB = new DynamoDB.DocumentClient();
const PORTFOLIO_TABLE = process.env.PORTFOLIO_TABLE!;
const POSITION_TABLE = process.env.POSITION_TABLE!;

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
        }
        break;

      case "POST":
        if (event.path.includes("/positions")) {
          // Add a new position
          const position = JSON.parse(event.body || "{}");
          return await addPosition(userId, portfolioId, position);
        }
        break;

      case "PUT":
        if (event.path.includes("/positions")) {
          // Update a position
          const ticker = event.pathParameters?.ticker;
          const position = JSON.parse(event.body || "{}");
          if (ticker) {
            return await updatePosition(userId, portfolioId, ticker, position);
          }
        }
        break;

      case "DELETE":
        if (event.path.includes("/positions")) {
          // Delete a position
          const ticker = event.pathParameters?.ticker;
          if (ticker) {
            return await deletePosition(userId, portfolioId, ticker);
          }
        }
        break;
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

async function getPortfolios(userId: string) {
  const params = {
    TableName: PORTFOLIO_TABLE,
    KeyConditionExpression: "userId = :userId",
    ExpressionAttributeValues: {
      ":userId": userId,
    },
  };

  const result = await dynamoDB.query(params).promise();

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(result.Items),
  };
}

async function getPositions(userId: string, portfolioId: string) {
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
    ExpressionAttributeValues: {
      ":portfolioId": portfolioId,
    },
  };

  const result = await dynamoDB.query(params).promise();

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(result.Items),
  };
}

// Add position function
async function addPosition(userId: string, portfolioId: string, position: any) {
  // Validation logic here

  // Add userId to the position for GSI
  position.userId = userId;
  position.portfolioId = portfolioId;

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
}

// Update position function
async function updatePosition(
  userId: string,
  portfolioId: string,
  ticker: string,
  updates: any
) {
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

  // Update position logic
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  Object.keys(updates).forEach((key) => {
    if (key !== "portfolioId" && key !== "ticker" && key !== "userId") {
      updateExpressions.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = updates[key];
    }
  });

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
}

// Delete position function
async function deletePosition(
  userId: string,
  portfolioId: string,
  ticker: string
) {
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
}
