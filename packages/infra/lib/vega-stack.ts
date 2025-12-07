import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';
import * as path from 'path';

export class VegaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket that will store all the scraped Doom content
    const doomCodexBucket = new s3.Bucket(this, 'DoomCodexBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Knowledge base (Vector database) that our orchestrator will interact with
    const doomCodexKB = new bedrock.VectorKnowledgeBase(this, 'DoomKB', {
      embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
      instruction: "Use this knowledge base to answer questions about DOOM lore, demons, and weapons.",
    });

    // Data source - connects KB and S3
    const doomCodexDataSource = new bedrock.S3DataSource(this, 'DoomCodexDataSource', {
      bucket: doomCodexBucket,
      knowledgeBase: doomCodexKB,
      dataSourceName: 'DoomWikiData',
      chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
    });

    // Lambda orchestrator
    const vegaCore = new PythonFunction(this, 'VegaCore', {
      entry: path.join(__dirname, '../../core'), // Points to packages/core
      runtime: lambda.Runtime.PYTHON_3_11,
      index: 'index.py',
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
      environment: {
        KNOWLEDGE_BASE_ID: doomCodexKB.knowledgeBaseId,
        MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      },
    });

    // Grant the lambda permissions to use Bedrock
    vegaCore.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:Retrieve'],
      resources: ['*'],
    }));

    // API gateway interface
    const vegaApi = new apigateway.LambdaRestApi(this, 'VegaEndpoint', {
      handler: vegaCore,
      proxy: false,
      defaultCorsPreflightOptions: {
        // To be updated
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Chat endpoint
    const vegaChatEndpoint = vegaApi.root.addResource('chat');
    vegaChatEndpoint.addMethod('POST'); // POST /chat calls the Lambda
    
    // Output the endpoint URL
    new cdk.CfnOutput(this, 'VegaApiUrl', {
      value: vegaApi.url,
    });
  }
}