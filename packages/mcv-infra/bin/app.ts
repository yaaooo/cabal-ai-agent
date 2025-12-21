#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { account, region } from "./env";
import { CabalDataStack } from "../lib/cabal-data-stack";
import { CabalComputeStack } from "../lib/cabal-compute-stack";

const app = new cdk.App();
const env = { account, region };

// Create data stack (S3, Bedrock)
const cabalDataStack = new CabalDataStack(app, "CabalStack", { env });

// Create compute stack (Lambda, API Gateway)
new CabalComputeStack(app, "CabalComputeStack", {
  env,
  nodArchivesKnowledgeBaseId: cabalDataStack.nodArchivesKnowledgeBaseId,
});
