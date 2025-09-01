const express = require("express");
const mime = require("mime-types");
const app = express();
const fs = require("fs/promises");
const path = require("path");
const cors = require("cors");
app.use(cors());
app.use("/api/:operation/:name(*)", (req, res, next) => {
  const ext = path.extname(req.params["name"]).toLowerCase();
  const contentPath = path.resolve("uploads", req.params["name"]);
  const baseDir = path.resolve("uploads");
  if (!contentPath.startsWith(baseDir)) {
    let error = new Error("Access denied");
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
    let uploadsContentInformation = [{ name: "../", type: "up", url: "/" }];
    let contentInformation = {};
    for (content of uploadsContent) {
      contentInformation = {};
      contentInformation.name = content.name;
      contentInformation.type = content.isFile() ? "file" : "dir";
      contentInformation.url = content.isFile()
        ? `/${content.name}`
        : `/${content.name}/`;
      uploadsContentInformation.push(contentInformation);
    }
    res.send({ path: "//", items: uploadsContentInformation });
  } catch (err) {
    next(err);
  }
});

app.get("/api/:operation/:name(*)", async (req, res, next) => {
  try {
    const ext = path.extname(req.params["name"]).toLowerCase();
    const contentPath = path.resolve("uploads", req.params["name"]);
    const contentStat = await fs.stat(contentPath);
    if (req.params["operation"] === "browse" && contentStat.isDirectory()) {
      const uploadsContent = await fs.readdir(contentPath, {
        withFileTypes: true,
      });
      let uploadsContentInformation = [{ name: "../", type: "up", url: "/" }];
      let contentInformation = {};
      for (content of uploadsContent) {
        contentInformation = {};
        contentInformation.name = content.name;
        contentInformation.type = content.isFile() ? "file" : "dir";
        contentInformation.url = content.isFile()
          ? `${req.params["name"]}/${content.name}` // FIX через path переписать
          : `${req.params["name"]}/${content.name}/`;
        uploadsContentInformation.push(contentInformation);
      }
      return res.send({
        path: `/${req.params["name"]}/`,
        items: uploadsContentInformation,
      });
    } else {
      if (req.params["operation"] === "file" && contentStat.isFile()) {
        res.setHeader("Content-Type", mime.lookup(ext));
        res.sendFile(contentPath);
      } else {
        let error = new Error();
        error.path = contentPath;
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, next) => {
  const errPath = path.extname(err.path).toLowerCase();
  let error = {
    status: 500,
    message: null,
    timestamp: new Date().toISOString(),
  };
  if (err.name === "traversalError") {
    error.status = 403;
    error.message = "Access denied";
    return res.send(error);
  }
  if (
    errPath === "" ||
    [".html", ".txt", ".json", ".img", ".png", ".jpeg", ".gif"].includes(
      errPath
    )
  ) {
    error.status = 405;
    error.message = "Content not found";
    return res.send(error);
  }
  if (
    ![".html", ".txt", ".json", ".img", ".png", ".jpeg", ".gif"].includes(
      errPath
    )
  ) {
    error.status = 415;
    error.message = "Unsupported Media Type";
    return res.send(error);
  }
  error.message = "Internal Server Error";
  return res.send(error);
});
app.listen(3002, () => console.log("Сервер ожидает подключения..."));
