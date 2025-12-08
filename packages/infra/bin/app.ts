#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VegaStack } from '../lib/vega-stack';
import { account, region } from "./env"

const app = new cdk.App();
new VegaStack(app, 'VegaStack', {
  env: { account, region },
});