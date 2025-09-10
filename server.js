const express = require("express");
const mime = require("mime-types");
const app = express();
const fs = require("fs/promises");
const path = require("path");
const cors = require("cors");

app.use(cors());
app.use("/api/:operation/:name(*)", (req, res, next) => {
  const contentPath = path.resolve("uploads", req.params.name);
  const baseDir = path.resolve("uploads");
  if (!contentPath.startsWith(baseDir)) {
    const error = new Error("Access denied");
    error.code = 403;
    error.name = "traversalError";
    next(error);
  }
  next();
});
app.get("/api/browse", async (req, res, next) => {
  try {
    const uploadsContent = await fs.readdir("./uploads", {
      withFileTypes: true,
    });
    const uploadsContentInformation = [];
    for (const content of uploadsContent) {
      uploadsContentInformation.push({
        name: content.name,
        type: content.isFile() ? "file" : "dir",
        url: content.isFile() ? `/${content.name}` : `/${content.name}/`,
      });
    }
    res.json({ path: "//", items: uploadsContentInformation });
  } catch (err) {
    next(err);
  }
});

app.get("/api/:operation/:name(*)", async (req, res, next) => {
  try {
    const localPath =
      req.params.name.at(-1) === "/"
        ? req.params.name.slice(0, -1)
        : req.params.name;
    const ext = path.extname(localPath).toLowerCase();
    const contentPath = path.resolve("uploads", localPath);
    const contentStat = await fs.stat(contentPath);
    if (req.params.operation === "browse" && contentStat.isDirectory()) {
      const uploadsContent = await fs.readdir(contentPath, {
        withFileTypes: true,
      });
      const uploadsContentInformation = [
        {
          name: "../",
          type: "up",
          url: `/${path.dirname(localPath)}/`,
        },
      ];
      for (const content of uploadsContent) {
        uploadsContentInformation.push({
          name: content.name,
          type: content.isFile() ? "file" : "dir",
          url: content.isFile() ? `/${content.name}` : `/${content.name}/`,
        });
      }
      return res.json({
        path: `/${localPath}/`,
        items: uploadsContentInformation,
      });
    } else {
      if (req.params.operation === "file" && contentStat.isFile()) {
        res.setHeader("Content-Type", mime.lookup(ext));
        res.sendFile(contentPath);
      } else {
        const error = new Error();
        error.path = contentPath;
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  const errPath = path.extname(err.path || " ").toLowerCase();
  const error = {
    status: 500,
    message: "Internal Server Error",
    timestamp: new Date().toISOString(),
  };
  if (err.name === "traversalError") {
    error.status = 403;
    error.message = "Access denied";
  } else if (
    errPath === "" ||
    [".html", ".txt", ".json", ".img", ".png", ".jpeg", ".gif"].includes(
      errPath
    )
  ) {
    error.status = 404;
    error.message = "Content not found";
  } else {
    error.status = 415;
    error.message = "Unsupported Media Type";
  }
  return res.json(error);
});
app.listen(3002, () => console.log("Сервер ожидает подключения..."));
