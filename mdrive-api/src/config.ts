import "dotenv/config";

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional("PORT", "3001"), 10),
  nodeEnv: optional("NODE_ENV", "development"),
  isDev: optional("NODE_ENV", "development") === "development",

  jwt: {
    secret: required("JWT_SECRET"),
  },

  mongodb: {
    uri: required("MONGODB_URI"),
  },

  b2: {
    endpoint: required("B2_ENDPOINT"),
    applicationKeyId: required("B2_APPLICATION_KEY_ID"),
    applicationKey: required("B2_APPLICATION_KEY"),
    bucketName: required("B2_BUCKET_NAME"),
    publicUrl: optional("B2_PUBLIC_URL", ""),
  },
} as const;
