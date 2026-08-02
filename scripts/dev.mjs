// Root dev launcher. Deliberately ignores extra CLI args (e.g. --port 8080)
// so the supervisor cannot recurse back into this script.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function run(name, cwd, args) {
  const child = spawn("npx", args, {
    cwd: join(root, cwd),
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
  child.on("exit", (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });
  return child;
}

const backend = run("backend", "backend", ["tsx", "watch", "index.ts"]);
const frontend = run("frontend", "frontend", ["vite", "dev", "--port", "8080", "--host"]);

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    backend.kill(sig);
    frontend.kill(sig);
    process.exit(0);
  });
}
