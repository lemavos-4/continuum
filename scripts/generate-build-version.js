#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildEnvPath = path.join(__dirname, "..", ".env.build");

const writeBuildEnv = (version) => {
  const content = `VITE_BUILD_VERSION=${version}\n`;
  fs.writeFileSync(buildEnvPath, content, "utf-8");
};

const getGitCommitSha = () => {
  try {
    const output = execSync("git rev-parse --short HEAD", {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.toString("utf-8").trim();
  } catch {
    return undefined;
  }
};

const run = async () => {
  const manual = process.env.VITE_BUILD_VERSION?.trim();
  if (manual?.length) {
    writeBuildEnv(manual);
    return;
  }

  const envSha = process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || process.env.COMMIT_SHA
    || process.env.CI_COMMIT_SHA;

  const sha = envSha?.trim() || getGitCommitSha();
  const date = new Date();
  const dateString = `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}.${String(date.getUTCDate()).padStart(2, "0")}`;

  if (!sha) {
    console.warn("Unable to resolve git commit SHA; using fallback value 'local'.");
    writeBuildEnv(`v${dateString}-local`);
    return;
  }

  writeBuildEnv(`v${dateString}-${sha}`);
};

run().catch((error) => {
  console.error("Failed to generate build version:", error);
  process.exit(1);
});
