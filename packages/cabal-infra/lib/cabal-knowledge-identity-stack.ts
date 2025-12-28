import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as opensearch from "aws-cdk-lib/aws-opensearchservice";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { getEmbeddingModelArn } from "./util";

interface CabalKnowledgeIdentityProps extends cdk.StackProps {
  nodS3Bucket: s3.Bucket;
  nodOpenSearchDomain: opensearch.Domain;
}

export class CabalKnowledgeIdentityStack extends cdk.Stack {
  public readonly nodKBRole: Role;

  constructor(
    scope: Construct,
    id: string,
    props: CabalKnowledgeIdentityProps,
  ) {
    super(scope, id, props);

    const { nodS3Bucket, nodOpenSearchDomain } = props;

    // Pre-define a KB role. We'll load this role with all *four*
    // necessary permissions right below.
    this.nodKBRole = new Role(this, "NodKBRole", {
      assumedBy: new ServicePrincipal("bedrock.amazonaws.com"),
    });

    // First, we set a resource policy on the S3 bucket containing
    // our raw data, allowing our KB role to read it.
    nodS3Bucket.grantRead(this.nodKBRole);

    // Second, we grant our KB permissions to get OpenSearch domains,
    // so that it can run its pre-flight check to confirm that
    // the domain we want to use actually exists.
    this.nodKBRole.addToPolicy(
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
    this.nodKBRole.addToPolicy(
      new PolicyStatement({
        actions: ["es:ESHttp*"],
        resources: [`${nodOpenSearchDomain.domainArn}/*`],
      }),
    );

    // Finally, we give the KB access to the Titan Embedding model,
    // which it will use to vectorize the raw S3 data.
    this.nodKBRole.addToPolicy(
      new PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: [getEmbeddingModelArn(this.region)],
      }),
    );
  }
}
