import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import { EbsDeviceVolumeType } from "aws-cdk-lib/aws-ec2";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { getEmbeddingModelArn } from "./util";

export class CabalStorageStack extends cdk.Stack {
  public readonly nodS3Bucket: s3.Bucket;
  public readonly nodOpenSearchDomain: opensearch.Domain;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an S3 Bucket which will store all raw Tiberian Sun content.
    this.nodS3Bucket = new s3.Bucket(this, "NodS3Bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create an OpenSearch Domain which will store the vectorized data.
    this.nodOpenSearchDomain = new opensearch.Domain(
      this,
      "NodOpenSearchDomain",
      {
        version: opensearch.EngineVersion.OPENSEARCH_2_11,
        // For CPU and RAM, we go with one t3.small.search instance since it's
        // small enough to not be too costly ($26/month) but large enough to
        // run OpenSearch with 2 GB memory.
        // Also, note that S3 vector stores were considered, but we opted to
        // remain on OpenSearch (while ditching serverless) to retain
        // hybrid (i.e. semantic + keyword) search functionality.
        capacity: {
          dataNodeInstanceType: "t3.small.search",
          dataNodes: 1,
        },
        // For storage, we'll use the minimum for this instance (10 GB).
        ebs: {
          volumeSize: 10,
          volumeType: EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3,
        },
        nodeToNodeEncryption: true,
        encryptionAtRest: { enabled: true },
        enforceHttps: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );
  }
}
