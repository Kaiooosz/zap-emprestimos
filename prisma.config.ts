import { defineConfig } from "prisma/config";
import fs from "fs";
import path from "path";

// Lê .env.local manualmente (Next.js convention)
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  const lines = fs.readFileSync(envLocal, "utf-8").split("\n");
  for (const line of lines) {
    const [key, ...rest] = line.split("=");
    if (key && rest.length) {
      const val = rest.join("=").replace(/^"(.*)"$/, "$1");
      if (!process.env[key.trim()]) process.env[key.trim()] = val;
    }
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"]!,
  },
});
