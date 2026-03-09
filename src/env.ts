import type { Keys } from "./types.ts";

export async function ensureDir(path: string) {
  await Deno.mkdir(path, { recursive: true });
}

export async function loadEnvMap(envFile: string | null): Promise<Map<string, string>> {
  const envMap = new Map<string, string>();
  if (!envFile) {
    return envMap;
  }

  try {
    const content = await Deno.readTextFile(envFile);
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }
      const eq = line.indexOf("=");
      if (eq === -1) {
        continue;
      }
      envMap.set(line.slice(0, eq).trim(), stripQuotes(line.slice(eq + 1).trim()));
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  return envMap;
}

export function loadKeys(envMap: Map<string, string>): Keys {
  return {
    openai: Deno.env.get("OPENAI_API_KEY") ?? envMap.get("OPENAI_API_KEY") ?? null,
    anthropic: Deno.env.get("ANTHROPIC_API_KEY") ?? envMap.get("ANTHROPIC_API_KEY") ?? null,
    google: Deno.env.get("GOOGLE_API_KEY") ?? envMap.get("GOOGLE_API_KEY") ?? null,
  };
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
