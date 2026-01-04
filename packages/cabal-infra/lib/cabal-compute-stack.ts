import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";

interface CabalComputeProps extends cdk.StackProps {
  nodKBId: string;
}

export class CabalComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CabalComputeProps) {
    super(scope, id, props);

    const { nodKBId } = props;

    // We use the DockerImageFunction construct instead of the PythonFunction
    // one because we're planning to operate a web server instead of a
    // traditional Lambda handler. This also gives us more granular
    // control over how we set up our container.
    const cabalCore = new lambda.DockerImageFunction(this, "CabalCore", {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, "../../../cabal-core"),
        {
          // We explicitly specify the platform to be arm64, which is the
          // same as that of our local M1 Mac. Note that there are cost
          // benefits associated with using arm64:
          // https://aws.amazon.com/blogs/apn/comparing-aws-lambda-arm-vs-x86-performance-cost-and-analysis-2/
          platform: cdk.aws_ecr_assets.Platform.LINUX_ARM64,
        },
      ),
      // Ensure Lambda architecture matches Docker image
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        // Environment variables for Lambda Web Adapter (LWA)
        // See Dockerfile in cabal-core for details
        AWS_LWA_INVOKE_MODE: "RESPONSE_STREAM",
        AWS_LWA_PORT: "8080",
        // Environment variables for CABAL agent code
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
