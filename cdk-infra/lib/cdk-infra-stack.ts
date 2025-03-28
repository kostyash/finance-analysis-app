import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class CdkInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB tables
    const portfolioTable = new dynamodb.Table(this, "PortfolioTable", {
      tableName: "Portfolios",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "portfolioId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Use DESTROY for dev, RETAIN for prod
    });

    const positionTable = new dynamodb.Table(this, "PositionTable", {
      tableName: "Positions",
      partitionKey: {
        name: "portfolioId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: { name: "ticker", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add GSI for positions by user
    positionTable.addGlobalSecondaryIndex({
      indexName: "UserIdIndex",
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Now define the portfolio Lambda function
    const portfolioFunction = new lambda.Function(this, "PortfolioFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/portfolio"),
      handler: "index.handler",
      environment: {
        PORTFOLIO_TABLE: portfolioTable.tableName,
        POSITION_TABLE: positionTable.tableName,
      },
    });

    // Grant permissions to Lambda functions
    portfolioTable.grantReadWriteData(portfolioFunction);
    positionTable.grantReadWriteData(portfolioFunction);

    const policyStatement = new iam.PolicyStatement({
      actions: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
      ],
      resources: [
        portfolioTable.tableArn,
        `${portfolioTable.tableArn}/index/*`,
        positionTable.tableArn,
        `${positionTable.tableArn}/index/*`,
      ],
    });

    portfolioFunction.addToRolePolicy(policyStatement);

    // Authentication - Cognito User Pool
    const userPool = new cognito.UserPool(this, "FinanceAppUserPool", {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: true,
        requireUppercase: true,
      },
      signInAliases: { email: true },
    });

    const userPoolClient = userPool.addClient("FinanceAppClient", {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        callbackUrls: [
          process.env.REACT_APP_REDIRECT_URL ||
            "http://localhost:3000/callback",
        ],
        logoutUrls: [
          process.env.REACT_APP_REDIRECT_URL || "http://localhost:3000",
        ],
      },
      preventUserExistenceErrors: true,
    });

    // Secure API with Cognito
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "FinanceApiAuthorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    // Create S3 bucket for website hosting
    const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, "Distribution", {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    // Stock data Lambda function
    const stockDataFunction = new lambda.Function(this, "StockDataFunction", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset("lambda/stock-data/dist"),
      handler: "index.handler",
      environment: {
        ALPHA_VANTAGE_API_KEY:
          process.env.ALPHA_VANTAGE_API_KEY || "YOUR_API_KEY",
      },
    });

    const api = new apigateway.RestApi(this, "FinanceApi", {
      restApiName: "Finance Analysis API",
      description: "API for finance analysis application",
      deploy: true, // Enable automatic deployment
      deployOptions: {
        stageName: "prod", // This creates a 'prod' stage
        description: "Production stage",
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
        allowCredentials: true,
      },
    });

    // Stock data endpoint
    const stocks = api.root.addResource("stocks");
    const stock = stocks.addResource("{ticker}");
    stock.addMethod("GET", new apigateway.LambdaIntegration(stockDataFunction));

    // Add this output
    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "The URL of the API Gateway",
    });

    // Output the CloudFront domain and S3 bucket name
    new cdk.CfnOutput(this, "CloudFrontDomain", {
      value: distribution.distributionDomainName,
      description: "The domain name of the CloudFront distribution",
    });

    new cdk.CfnOutput(this, "WebsiteBucketName", {
      value: websiteBucket.bucketName,
      description: "The name of the S3 bucket",
    });

    // Create a Lambda Layer for Python dependencies
    const analyticsLayer = new lambda.LayerVersion(this, "AnalyticsLayer", {
      code: lambda.Code.fromAsset("lambda-layer.zip"),
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_9],
      description: "Dependencies for the Financial Analysis Lambda function",
    });

    // Create a Python Lambda function for advanced analytics
    const analyticsFunction = new lambda.Function(this, "AnalyticsFunction", {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: "index.lambda_handler",
      code: lambda.Code.fromAsset("lambda/analysis"), // This will be created in a separate directory
      layers: [
        lambda.LayerVersion.fromLayerVersionArn(
          this,
          "ExistingAnalyticsLayer", // Use a different logical ID
          "arn:aws:lambda:il-central-1:084375577657:layer:mybestlayer:1"
        ),
      ],
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        PORTFOLIO_TABLE: portfolioTable.tableName,
        POSITION_TABLE: positionTable.tableName,
      },
    });

    // Grant the Lambda function read access to the DynamoDB tables
    portfolioTable.grantReadData(analyticsFunction);
    positionTable.grantReadData(analyticsFunction);

    // Portfolio routes
    const portfolioResource = api.root.addResource("portfolio");

    // GET /portfolio - Get all portfolios
    portfolioResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // POST /portfolio - Create a new portfolio
    portfolioResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Individual portfolio operations
    const singlePortfolioResource =
      portfolioResource.addResource("{portfolioId}");

    // GET /portfolio/{portfolioId} - Get a specific portfolio
    singlePortfolioResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // PUT /portfolio/{portfolioId} - Update a portfolio
    singlePortfolioResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // DELETE /portfolio/{portfolioId} - Delete a portfolio
    singlePortfolioResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const importResource = singlePortfolioResource.addResource("import");
    importResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Position routes
    const positionsResource = singlePortfolioResource.addResource("positions");

    // GET /portfolio/{portfolioId}/positions - Get all positions for a portfolio
    positionsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // POST /portfolio/{portfolioId}/positions - Add a position to a portfolio
    positionsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Individual position operations
    const singlePositionResource = positionsResource.addResource("{ticker}");

    // GET /portfolio/{portfolioId}/positions/{ticker} - Get a specific position
    singlePositionResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // PUT /portfolio/{portfolioId}/positions/{ticker} - Update a position
    singlePositionResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // DELETE /portfolio/{portfolioId}/positions/{ticker} - Delete a position
    singlePositionResource.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(portfolioFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    // Add an API Gateway endpoint for the analytics function
    const analyticsResource = api.root.addResource("analysis");

    // Add different resources for each type of analysis
    const performanceResource = analyticsResource.addResource("performance");
    performanceResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(analyticsFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const technicalResource = analyticsResource.addResource("technical");
    technicalResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(analyticsFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const riskResource = analyticsResource.addResource("risk");
    riskResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(analyticsFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const benchmarkResource = analyticsResource.addResource("benchmark");
    benchmarkResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(analyticsFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );

    const diversificationResource =
      analyticsResource.addResource("diversification");
    diversificationResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(analyticsFunction),
      {
        authorizer: authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      }
    );
  }
}
