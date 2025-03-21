import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class CdkInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

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
      code: lambda.Code.fromAsset("lambda/stock-data/dist"), // Point to the dist directory
      handler: "index.handler",
      environment: {
        ALPHA_VANTAGE_API_KEY: "LSMICCSD8CNIEXRV", // Replace with your API key
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    const api = new apigateway.RestApi(this, "FinanceApi", {
      restApiName: "Finance Analysis API",
      description: "API for finance analysis application",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
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
  }
}
