import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import { bedrock } from "@cdklabs/generative-ai-cdk-constructs";
import * as path from "path";

export class CabalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket that will store all the scraped Tiberian Sun content
    const nodArchivesBucket = new s3.Bucket(this, "NodArchivesBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Knowledge base (Vector database) that our orchestrator will interact with
    const nodArchivesKB = new bedrock.VectorKnowledgeBase(
      this,
      "NodArchivesKB",
      {
        embeddingsModel:
          bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
        instruction:
          "Use this knowledge base to answer questions about the Tiberian Sun universe.",
      },
    );

    // Data source - connects KB and S3
    new bedrock.S3DataSource(this, "NodArchivesDataSource", {
      bucket: nodArchivesBucket,
      knowledgeBase: nodArchivesKB,
      dataSourceName: "NodArchivesDataSource",
      chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
    });

    // Lambda orchestrator
    const cabalCore = new PythonFunction(this, "CabalCore", {
      entry: path.join(__dirname, "../../../core-backend"),
      runtime: lambda.Runtime.PYTHON_3_12,
      index: "cabal.py",
      handler: "handler",
      timeout: cdk.Duration.seconds(60),
      environment: {
        KNOWLEDGE_BASE_ID: nodArchivesKB.knowledgeBaseId,
        // Note that:
        // - Anthropic requires a manual access request via the console
        // - We pick Claude Haiku over Sonnet for cost efficiency since
        //   CABAL may receive higher volume as a chatbot
        MODEL_ID: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
      },
    });

    // Give lambda permissions to interact with models
    cabalCore.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        resources: [
          // Allow the "us." inference profiles
          `arn:aws:bedrock:us-east-1:${this.account}:inference-profile/*`,
          `arn:aws:bedrock:us-west-2:${this.account}:inference-profile/*`,
          // Region wildcard since inference is cross-region (any US)
          `arn:aws:bedrock:*::foundation-model/*`,
        ],
      }),
    );

    // Give lambda permissions to interact with KB
    cabalCore.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:Retrieve"],
        resources: [
          `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${nodArchivesKB.knowledgeBaseId}`,
        ],
      }),
    );

    // Give lambda permissions to interact with AWS marketplace, see error below:
    // "Model access is denied due to IAM user or service role is not authorized to
    // perform the required AWS Marketplace actions (aws-marketplace:ViewSubscriptions,
    // aws-marketplace:Subscribe) to enable access to this model"
    cabalCore.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "aws-marketplace:ViewSubscriptions",
          "aws-marketplace:Subscribe",
          "aws-marketplace:Unsubscribe",
        ],
        // Note marketplace subscriptions are global/account-level
        resources: ["*"],
      }),
    );

    // API gateway interface
    const cabalApi = new apigateway.LambdaRestApi(this, "CabalEndpoint", {
      handler: cabalCore,
      proxy: false,
      defaultCorsPreflightOptions: {
        // To be updated
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Chat endpoint
    const cabalChatEndpoint = cabalApi.root.addResource("chat");
    cabalChatEndpoint.addMethod("POST"); // POST /chat calls the Lambda

    // Output the endpoint URL
    new cdk.CfnOutput(this, "CabalApiUrl", {
      value: cabalApi.url,
    });
  }
}
