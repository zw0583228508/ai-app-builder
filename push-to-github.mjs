#!/usr/bin/env node
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";

const { ReplitConnectors } = await import("@replit/connectors-sdk");
const connectors = new ReplitConnectors();

const connections = await connectors.listConnections({ connector_names: "github" });
const token = connections[0]?.settings?.access_token;

if (!token) {
  console.error("GitHub not connected. Connect GitHub at replit.com/account");
  process.exit(1);
}

const helper = "/tmp/_gh_push_helper.sh";
writeFileSync(helper, `#!/bin/bash\necho "username=token"\necho "password=${token}"\n`, { mode: 0o700 });

try {
  const result = execSync(
    `git -c credential.helper='${helper}' push github master:main`,
    { encoding: "utf8", stdio: "pipe", timeout: 120000 }
  );
  console.log("✅ Pushed to https://github.com/zw0583228508/ai-app-builder");
  if (result) console.log(result);
} catch (err) {
  console.error("❌ Push failed:", err.stderr || err.message);
} finally {
  try { unlinkSync(helper); } catch {}
}
