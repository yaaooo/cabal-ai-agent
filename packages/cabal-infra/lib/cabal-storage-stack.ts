import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import { EbsDeviceVolumeType } from "aws-cdk-lib/aws-ec2";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { getEmbeddingModelArn } from "./util";

export class CabalStorageStack extends cdk.Stack {
  public readonly nodS3Bucket: s3.Bucket;
  public readonly nodOpenSearchDomain: opensearch.Domain;
  public readonly nodKBRole: Role;

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

    // Pre-define a Bedrock KB role. We'll load this role with
    // all necessary permissions right below.
    this.nodKBRole = new Role(this, "NodKBRole", {
      assumedBy: new ServicePrincipal("bedrock.amazonaws.com"),
    });

    // Set up access to the Open Search Domain for the KB role.
    // Note that this has to be done *here*. We cannot simply
    // pass the KB role down to CabalKnowledgeStack and add
    // a resource policy later, because that would result
    // in a circular dependency between both stacks.
    this.nodOpenSearchDomain.addAccessPolicies(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [this.nodKBRole],
        // Allow the KB role to take HTTP actions on OpenSearch.
        actions: ["es:ESHttp*"],
        resources: [`${this.nodOpenSearchDomain.domainArn}/*`],
      }),
    );

    // Set up read access on the S3 bucket for the KB role
    // with a resource policy.
    this.nodS3Bucket.grantRead(this.nodKBRole);

    // Grant the KB role access to the Titan Embedding model
    // with an identity policy, which the KB will use for
    // vectorizing the raw S3 data.
    this.nodKBRole.addToPolicy(
      new PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [getEmbeddingModelArn(this.region)],
      }),
    );
  }
}
