const express = require("express");
const mime = require("mime-types");
const app = express();
const fs = require("fs/promises");
const path = require("path");
const cors = require("cors");
app.use(cors());
//app.use((req, res, next) => {});
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

app.get("/api/:operation/:name", async (req, res, next) => {
  try {
    console.log(req.params["name"] + " " + req.params["operation"]);
    const ext = path.extname(req.params["name"]).toLowerCase();
    const contentPath = path.resolve("uploads", req.params["name"]);
    const baseDir = path.resolve("uploads");
    if (!contentPath.startsWith(baseDir)) {
      return res.status(403).send("Access denied");
    }
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
          ? `${req.params["name"]}/${content.name}`
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
        throw { path: contentPath }; // FIX
      }
    }
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.log(err.path);
  const errPath = path.extname(err.path).toLowerCase();
  if (
    errPath === "" ||
    [".html", ".txt", ".json", ".img", ".png", ".jpeg", ".gif"].includes(
      errPath
    )
  ) {
    return res.status(405).send("Not Found");
  }
  if (
    ![".html", ".txt", ".json", ".img", ".png", ".jpeg", ".gif"].includes(
      errPath
    )
  ) {
    return res.status(415).send("Unsupported Media Type");
  }
  res.status(500).send("Internal Server Error");
});
app.listen(3001, () => console.log("Сервер ожидает подключения..."));
