# CABAL AI Agent

An AI agent built for the universe of [Command and Conquer: Tiberian Sun](https://en.wikipedia.org/wiki/Command_%26_Conquer%3A_Tiberian_Sun). As the name suggests, this agent is configured to assume the personality of [CABAL](https://cnc.fandom.com/wiki/Computer_Assisted_Biologically_Augmented_Lifeform).

Built with React + TypeScript, Langchain + Python, and AWS CDK constructs (Bedrock, Lambda, etc). 

## Usage

TBA

## Structure

This project is a monorepo managed with NPM workspaces. It comprises several packages.

### @cabal-ai-agent/core-backend

Python LangGraph + LangChain package powering CABAL's agent runtime. Think of this as the server-side (AWS Lambda) backend.

### @cabal-ai-agent/mcv-infra

TypeScript CDK package containing AWS resource definitions (e.g. S3, Bedrock, Lambda).

### @cabal-ai-agent/montauk-ui

TypeScript React package powering CABAL's UI. Think of this as the client-side (browser) frontend.

### @cabal-ai-agent/harvester-utils

TypeScript package containing utilities for miscellaneous needs (e.g. web crawling and scraping for CABAL's data archives).

## Credits

Biggest thanks to everyone who's contributed to https://cnc.fandom.com — the contents of the knowledge base powering this AI agent are derived from the site. This was purely built for fun and none of this work is meant for commercial use.