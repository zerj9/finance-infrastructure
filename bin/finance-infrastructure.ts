#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FinanceInfrastructureStack } from '../lib/finance-infrastructure-stack';

const finance  = { account: '025066238498', region: 'us-east-1' };

const app = new cdk.App();
new FinanceInfrastructureStack(app, 'FinanceInfrastructureStack', { env: finance });
