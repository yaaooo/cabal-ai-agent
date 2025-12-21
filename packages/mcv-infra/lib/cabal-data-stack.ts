import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { bedrock } from "@cdklabs/generative-ai-cdk-constructs";

export class CabalDataStack extends cdk.Stack {
  public readonly nodArchivesKnowledgeBaseId: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket that will store all the scraped Tiberian Sun content
    const nodArchivesBucket = new s3.Bucket(this, "NodArchivesBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Knowledge base (Vector database) that our orchestrator will interact with
    const nodArchivesKnowledgeBase = new bedrock.VectorKnowledgeBase(
      this,
      "NodArchivesKB",
      {
        embeddingsModel:
          bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V2_1024,
        instruction:
          "Use this knowledge base to answer questions about the Tiberian Sun universe.",
      },
    );
    this.nodArchivesKnowledgeBaseId = nodArchivesKnowledgeBase.knowledgeBaseId;

    // Data source - connects KB and S3
    new bedrock.S3DataSource(this, "NodArchivesDataSource", {
      bucket: nodArchivesBucket,
      knowledgeBase: nodArchivesKnowledgeBase,
      dataSourceName: "NodArchivesDataSource",
      chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
    });
  }
}
