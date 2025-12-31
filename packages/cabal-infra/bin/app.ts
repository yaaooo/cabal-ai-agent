#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { account, region } from "./env";
import { CabalComputeStack } from "../lib/cabal-compute-stack";
import { CabalStorageStack } from "../lib/cabal-storage-stack";
import { CabalKnowledgeStack } from "../lib/cabal-knowledge-stack";
import { CabalKnowledgeIdentityStack } from "../lib/cabal-knowledge-identity-stack";

const app = new cdk.App();
const env = { account, region };

// Create storage stack (S3, OpenSearch, Secrets)
const cabalStorageStack = new CabalStorageStack(app, "CabalStorageStack", {
  env,
});
const { nodS3Bucket, nodOpenSearchDomain } = cabalStorageStack;

// Create knowledge identity stack (Bedrock KB role)
// Note: We separate this from the knowledge stack below so that we can
// manually map the ARN of KB IAM role to a backend role on OpenSearch
// *before* creating the actual KB. KB creation would fail otherwise.
const cabalKnowledgeIdentityStack = new CabalKnowledgeIdentityStack(
  app,
  "CabalKnowledgeIdentityStack",
  {
    env,
    nodS3Bucket,
    nodOpenSearchDomain,
  },
);
const { nodKBRole } = cabalKnowledgeIdentityStack;
cabalKnowledgeIdentityStack.addDependency(cabalStorageStack);

// Create knowledge stack (Bedrock KB)
const cabalKnowledgeStack = new CabalKnowledgeStack(
  app,
  "CabalKnowledgeStack",
  {
    env,
    nodS3Bucket,
    nodOpenSearchDomain,
    nodKBRole,
  },
);
const { nodKBId } = cabalKnowledgeStack;
cabalKnowledgeStack.addDependency(cabalKnowledgeIdentityStack);

// Create compute stack (Lambda, API Gateway)
const cabalComputeStack = new CabalComputeStack(app, "CabalComputeStack", {
  env,
  nodKBId,
});
cabalComputeStack.addDependency(cabalKnowledgeStack);
