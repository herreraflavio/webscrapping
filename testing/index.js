const fs = require("fs");
const fsp = fs.promises;
const axios = require("axios");
const path = require("path");
require("dotenv").config();
const TOKEN = process.env.TOKEN;

// Handling uncaught exceptions and promise rejections
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

function getCleanFilename(i, counter) {
  const filename = `file${i}-${counter}.pdf`;
  return filename;
}

async function downloadPdf(url, folder, i, counter) {
  const filename = getCleanFilename(i, counter);
  const filePath = path.join(folder, filename);

  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      timeout: 30000,
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    response.data.on("error", (err) => {
      console.error("Error during download stream:", err);
      writer.close();
      reject(`Failed during download stream: ${filePath}`);
    });

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`File downloaded successfully: ${filePath}`);
        resolve(`Downloaded: ${filePath}`);
      });
      writer.on("error", (err) => {
        console.error(`Error writing file: ${filePath}`, err);
        writer.close();
        reject(`Failed to download: ${filePath}`);
      });
    });
  } catch (error) {
    console.error(`Error downloading from ${url}:`, error);
    return `Error downloading from ${url}: ${error.message}`;
  }
}

async function processUrls(nestedUrls, start) {
  console.log("Processing URLs...");
  // console.log(nestedUrls);
  console.log(
    `Initial Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`
  );
  for (let i = 0; i < nestedUrls.length; i++) {
    console.log("Processing folder", i + start);
    const folderName = path.join(
      __dirname,
      `output/pdfs-updated/folder${i + start}`
    );
    let counter = 0;
    for (let urls of nestedUrls[i]) {
      counter++;
      console.log("Processing URLs for folder", i + start);
      console.log("Processing URL", urls);
      if (urls.endsWith(".pdf")) {
        console.log("Downloading", urls);
        await downloadPdf(urls, folderName, i, counter).then(() => {
          console.log(`Downloaded ${urls} into ${folderName}`);
        });
      }
    }
  }
  console.log(
    `Final Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`
  );
}

const readSavedResultsPathName = "searchResults.json";
//const readSavedResultsPathName2 = "searchResultsBackUp.json";

(async () => {
  try {
    const data = await fsp.readFile(readSavedResultsPathName, "utf8");
    const results = JSON.parse(data);
    const start = 1701;
    await processUrls(results, start);
    console.log("URLs processed successfully.");
  } catch (error) {
    console.error("Failed to read or process URLs:", error);
  }
})();
