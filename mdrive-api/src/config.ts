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
  get port() { return parseInt(optional("PORT", "3001"), 10); },
  get nodeEnv() { return optional("NODE_ENV", "development"); },
  get isDev() { return optional("NODE_ENV", "development") === "development"; },

  jwt: {
    get secret() { return required("JWT_SECRET"); },
  },

  mongodb: {
    get uri() { return required("MONGODB_URI"); },
  },

  b2: {
    get endpoint() { return required("B2_ENDPOINT"); },
    get applicationKeyId() { return required("B2_APPLICATION_KEY_ID"); },
    get applicationKey() { return required("B2_APPLICATION_KEY"); },
    get bucketName() { return required("B2_BUCKET_NAME"); },
    get publicUrl() { return optional("B2_PUBLIC_URL", ""); },
  },
} as const;
