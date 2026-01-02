import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import { PythonFunction } from "@aws-cdk/aws-lambda-python-alpha";
import * as path from "path";
import {
  LAMBDA_WEB_ADAPTER_ACCOUNT,
  LAMBDA_WEB_ADAPTER_LAYER_NAME,
  LAMBDA_WEB_ADAPTER_VERSION,
} from "./constants";

interface CabalComputeProps extends cdk.StackProps {
  nodKBId: string;
}

export class CabalComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CabalComputeProps) {
    super(scope, id, props);

    const { nodKBId } = props;

    // Reference a Lambda Web Adapter (LWA) layer which translates incoming
    // Lambda events into standard HTTP requests that our Uvicorn server
    // can process. The LWA would be a sidecar process next to Uvicorn.
    //
    // The main benefit of using LWA is that it allows us to fashion our
    // code the same way we write up a regular HTTP server. We avoid
    // worrying about Lambda-specific requirements (e.g. `handler()`).
    //
    // This means we can more easily support response streaming without
    // having to jump through Lambda-specific hoops.
    //
    // Some useful references:
    // - https://github.com/awslabs/aws-lambda-web-adapter
    // - https://aws.amazon.com/blogs/compute/using-response-streaming-with-aws-lambda-web-adapter-to-optimize-performance/
    const lambdaAdapterLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "LambdaAdapterLayer",
      `arn:aws:lambda:${this.region}:${LAMBDA_WEB_ADAPTER_ACCOUNT}:layer:${LAMBDA_WEB_ADAPTER_LAYER_NAME}:${LAMBDA_WEB_ADAPTER_VERSION}`,
    );

    // Lambda Function
    const cabalCore = new PythonFunction(this, "CabalCore", {
      entry: path.join(__dirname, "../../../cabal-core"),
      runtime: lambda.Runtime.PYTHON_3_12,
      index: "cabal.py",
      handler: "run.sh",
      timeout: cdk.Duration.seconds(60),
      // Extend Lambda with Lambda Web Adapter
      layers: [lambdaAdapterLayer],
      environment: {
        // Environment variables for Lambda Web Adapter
        AWS_LWA_INVOKE_MODE: "RESPONSE_STREAM",
        AWS_LWA_PORT: "8080",
        // Environment variables for Lambda CABAL agent code
        KNOWLEDGE_BASE_ID: nodKBId,
        // We define the Bedrock model we'll be using. Some notes:
        // - Anthropic models need to be manually enabled in the console
        // - We pick Claude Haiku over Sonnet for cost efficiency since
        //   CABAL may receive higher volume as a chatbot
        MODEL_ID: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
      },
    });

    // Define a Lambda function URL for response streaming. We use this
    // instead of API gateway for simplicity
    const functionUrl = cabalCore.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
      cors: {
        // TODO: Update origins to only accept CABAL client
        allowedOrigins: ["*"],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ["*"],
      },
    });

    // Give Lambda permissions to interact with models
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

    // Give Lambda permissions to interact with KB
    cabalCore.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:Retrieve"],
        resources: [
          `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${nodKBId}`,
        ],
      }),
    );

    // Give Lambda permissions to interact with AWS marketplace, see error below:
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

    // Print out the Lambda function URL
    new cdk.CfnOutput(this, "CabalFunctionUrl", {
      value: functionUrl.url,
      description: "CABAL Lambda Function URL",
    });
  }
}
