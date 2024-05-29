const fs = require("fs");
const path = require("path");

const baseDir = "./output/pdfs-updated";

const startFolder = 500;
const endFolder = 1000;

let missingFolders = [];

for (let i = startFolder; i <= endFolder; i++) {
  let folderName = `folder${i}`;
  let folderPath = path.join(baseDir, folderName);

  if (!fs.existsSync(folderPath)) {
    missingFolders.push(folderName);
  }
}

console.log("Missing folders:", missingFolders);
