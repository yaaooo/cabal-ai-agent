#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CabalStack } from "../lib/cabal-stack";
import { account, region } from "./env";

const app = new cdk.App();
new CabalStack(app, "CabalStack", { env: { account, region } });
