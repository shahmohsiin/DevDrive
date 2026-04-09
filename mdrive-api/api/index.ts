import { buildApp } from "../src/app.js";

let appInstance: Awaited<ReturnType<typeof buildApp>> | null = null;

async function getApp() {
  if (!appInstance) {
    appInstance = await buildApp();
    await appInstance.ready();
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
    app.server.emit("request", req, res);
  } catch (err: any) {
    console.error("CRITICAL STARTUP ERROR:", err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: "FUNCTION_INVOCATION_FAILED (caught)",
      message: err?.message || String(err),
      stack: err?.stack
    }));
  }
}
