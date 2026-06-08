import fs from "node:fs";
import path from "node:path";

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const MEDIA_DIRS = ["audios", "fonts", "images", "videos"];

export function resolveProjectDataDir(fromDir) {
  return path.resolve(fromDir, "../data");
}

export function dataAssetsPlugin(dataDir) {
  const resolvedDataDir = path.resolve(dataDir);
  let outDir = "dist";

  return {
    name: "capstone-data-assets",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use("/data", (req, res, next) => {
        try {
          const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/+/, "");
          if (!urlPath) {
            next();
            return;
          }

          const filePath = path.normalize(path.join(resolvedDataDir, urlPath));
          if (!filePath.startsWith(resolvedDataDir)) {
            res.statusCode = 403;
            res.end();
            return;
          }

          if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            next();
            return;
          }

          const ext = path.extname(filePath).toLowerCase();
          res.setHeader("Content-Type", MIME_TYPES[ext] ?? "application/octet-stream");
          fs.createReadStream(filePath).pipe(res);
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      const targetRoot = path.resolve(outDir, "data");
      fs.mkdirSync(targetRoot, { recursive: true });

      for (const dir of MEDIA_DIRS) {
        const source = path.join(resolvedDataDir, dir);
        if (!fs.existsSync(source)) {
          continue;
        }
        fs.cpSync(source, path.join(targetRoot, dir), { recursive: true });
      }
    },
  };
}
