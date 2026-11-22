// Real API processes and worker using a disposable, file-backed SQLite database.
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const cwd = path.resolve("../backend"),
  python = path.join(
    cwd,
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
let directory: string, env: NodeJS.ProcessEnv;
let children: ChildProcess[] = [];

export async function startServices() {
  directory = mkdtempSync(path.join(tmpdir(), "tablelane-e2e-"));
  env = {
    ...process.env,
    DATABASE_URL:
      "sqlite:///" + path.join(directory, "workspace.db").replaceAll("\\", "/"),
    UPLOAD_DIR: path.join(directory, "uploads"),
    PUBLIC_MENU_BASE_URL: "http://guest.tablelane.test:3012",
    FRONTEND_ORIGIN: "http://127.0.0.1:3011",
    ADMIN_HOSTS: "localhost,127.0.0.1",
  };
  await restartServices();
}
async function stop() {
  await Promise.all(
    children.map(async (child) => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const stopped = once(child, "exit");
      child.kill();
      await stopped;
    }),
  );
  children = [];
}
export async function restartServices() {
  await stop();
  execFileSync(python, ["-m", "app.bootstrap"], { cwd, env, stdio: "inherit" });
  for (const [module, port, probe, status] of [
    ["app.private:app", 8021, "/api/branches", 200],
    ["app.main:app", 8022, "/api/menu/missing", 404],
  ] as const) {
    const child = spawn(
      python,
      ["-m", "uvicorn", module, "--host", "127.0.0.1", "--port", String(port)],
      { cwd, env, stdio: "ignore" },
    );
    children.push(child);
    let ready = false;
    for (let i = 0; i < 150; i++) {
      if (child.exitCode !== null) throw Error("API process exited: " + module);
      try {
        if (
          (await fetch("http://127.0.0.1:" + port + probe)).status === status
        ) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!ready) throw Error("API unavailable: " + module);
  }
  children.push(
    spawn(python, ["-m", "app.worker"], { cwd, env, stdio: "ignore" }),
  );
}
export async function closeServices() {
  await stop();
  if (directory) rmSync(directory, { recursive: true, force: true });
}
