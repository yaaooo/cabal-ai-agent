#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { account, region } from "./env";
import { CabalComputeStack } from "../lib/cabal-compute-stack";
import { CabalStorageStack } from "../lib/cabal-storage-stack";
import { CabalKnowledgeStack } from "../lib/cabal-knowledge-stack";

const app = new cdk.App();
const env = { account, region };

// Create storage stack (S3, OpenSearch)
const cabalStorageStack = new CabalStorageStack(app, "CabalStorageStack", {
  env,
});
const { nodS3Bucket, nodOpenSearchDomain, nodKBRole } = cabalStorageStack;

// Create knowledge stack (Bedrock KB, Bedrock Data Source)
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
cabalKnowledgeStack.addDependency(cabalStorageStack);

// Create compute stack (Lambda, API Gateway)
const cabalComputeStack = new CabalComputeStack(app, "CabalComputeStack", {
  env,
  nodKBId,
});
cabalComputeStack.addDependency(cabalKnowledgeStack);
