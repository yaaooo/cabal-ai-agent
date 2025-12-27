export const getEmbeddingModelArn = (region: string) =>
  `arn:aws:bedrock:${region}::foundation-model/amazon.titan-embed-text-v2:0`;
