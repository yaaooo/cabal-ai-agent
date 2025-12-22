import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import * as path from "path";

interface CabalComputeProps extends cdk.StackProps {
  nodKBId: string;
}

export class CabalComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CabalComputeProps) {
    super(scope, id, props);

    const { nodKBId } = props;

    // Lambda orchestrator
    const cabalCore = new PythonFunction(this, "CabalCore", {
      entry: path.join(__dirname, "../../../core-backend"),
      runtime: lambda.Runtime.PYTHON_3_12,
      index: "cabal.py",
      handler: "handler",
      timeout: cdk.Duration.seconds(60),
      environment: {
        KNOWLEDGE_BASE_ID: nodKBId,
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
          `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${nodKBId}`,
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
