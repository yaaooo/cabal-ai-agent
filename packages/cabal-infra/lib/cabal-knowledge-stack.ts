import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { getEmbeddingModelArn } from "./util";

interface CabalKnowledgeProps extends cdk.StackProps {
  nodS3Bucket: s3.Bucket;
  nodOpenSearchDomain: opensearch.Domain;
}

export class CabalKnowledgeStack extends cdk.Stack {
  public readonly nodKBId: string;

  constructor(scope: Construct, id: string, props: CabalKnowledgeProps) {
    super(scope, id, props);

    const { nodS3Bucket, nodOpenSearchDomain } = props;

    // Pre-define a KB role. We'll load this role with all *four*
    // necessary permissions right below.
    const nodKBRole = new Role(this, "NodKBRole", {
      assumedBy: new ServicePrincipal("bedrock.amazonaws.com"),
    });

    // First, we set a resource policy on the S3 bucket containing
    // our raw data, allowing our KB role to read it.
    nodS3Bucket.grantRead(nodKBRole);

    // Second, we grant our KB permissions to get OpenSearch domains,
    // so that it can run its pre-flight check to confirm that
    // the domain we want to use actually exists.
    nodKBRole.addToPolicy(
      new PolicyStatement({
        actions: [
          "es:DescribeDomain",
          "es:DescribeElasticsearchDomain",
          "es:ListDomainNames",
        ],
        resources: [nodOpenSearchDomain.domainArn],
      }),
    );

    // Third, we allow the KB role to make HTTP requests to OpenSearch.
    nodKBRole.addToPolicy(
      new PolicyStatement({
        actions: ["es:ESHttp*"],
        resources: [`${nodOpenSearchDomain.domainArn}/*`],
      }),
    );

    // Finally, we give the KB access to the Titan Embedding model,
    // which it will use to vectorize the raw S3 data.
    nodKBRole.addToPolicy(
      new PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [getEmbeddingModelArn(this.region)],
      }),
    );

    // With our role permissions in place, we now create a KB which
    // will manage both data *ingestion* and *retrieval*
    // - Ingestion simply refers to the process of chunkifying S3 data,
    //   feeding chunks to the Titan embedding model, and then saving
    //   the vectorized data in OpenSearch.
    // - Retrieval simply refers to the process of querying OpenSearch
    //   and returning relevant chunks to the agent.
    const nodKB = new bedrock.CfnKnowledgeBase(this, "NodKB", {
      name: "NodKB",
      // Passing the KB role we defined earlier.
      roleArn: nodKBRole.roleArn,
      // Specifying how we will vectorize the raw data from S3.
      knowledgeBaseConfiguration: {
        type: "VECTOR",
        vectorKnowledgeBaseConfiguration: {
          embeddingModelArn: getEmbeddingModelArn(this.region),
        },
      },
      // Specifying how we will store the vectorized data.
      storageConfiguration: {
        type: "OPENSEARCH_MANAGED_CLUSTER",
        opensearchManagedClusterConfiguration: {
          domainArn: nodOpenSearchDomain.domainArn,
          domainEndpoint: `https://${nodOpenSearchDomain.domainEndpoint}`,
          // We specify the index, vector, text, and metadata label so
          // that the KB knows how to write this data to OpenSearch.
          vectorIndexName: "nod-index",
          fieldMapping: {
            vectorField: "nod-vector",
            textField: "nod-text",
            metadataField: "nod-metadata",
          },
        },
      },
    });
    // Ensure role is ready before CDK sets up KB
    nodKB.node.addDependency(nodKBRole);

    // Expose KB Id to our Compute stack
    this.nodKBId = nodKB.attrKnowledgeBaseId;

    // Create data source that exposes S3 data to our Bedrock KB.
    // Note that multiple data sources can be created later if we'd like.
    new bedrock.CfnDataSource(this, "NodDataSource", {
      name: "NodDataSource",
      dataSourceConfiguration: {
        type: "S3",
        s3Configuration: {
          bucketArn: nodS3Bucket.bucketArn,
        },
      },
      knowledgeBaseId: nodKB.attrKnowledgeBaseId,
      vectorIngestionConfiguration: {
        // Each `chunk` describes a segment of text to be vectorized.
        chunkingConfiguration: {
          chunkingStrategy: "FIXED_SIZE",
          fixedSizeChunkingConfiguration: {
            // For `maxTokens` per chunk,
            // Low -> More granular chunks, precise retrieval
            // High -> Larger chunks, larger context
            maxTokens: 300,
            // For `overlapPercentage` between chunks,
            // Low -> Efficient storage, but context may be fragmented
            // High -> Ideas are linked, but more redundancy
            overlapPercentage: 20,
          },
        },
      },
    });
  }
}
