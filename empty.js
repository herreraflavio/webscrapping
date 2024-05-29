const fs = require("fs");
const path = require("path");

const baseDir = "./output/pdfs-updated";

const startFolder = 500;
const endFolder = 1000;

let emptyFolders = [];

for (let i = startFolder; i <= endFolder; i++) {
  let folderName = `folder${i}`;
  let folderPath = path.join(baseDir, folderName);

  if (fs.existsSync(folderPath)) {
    let files = fs.readdirSync(folderPath);

    if (files.length === 0) {
      emptyFolders.push(folderName);
    }
  }
}

console.log("Empty folders:", emptyFolders);
