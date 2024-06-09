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

async function googleSearch(query) {
  const data = JSON.stringify([
    {
      keyword: `${query}`,
      location_code: 2840,
      language_code: "en",
      device: "desktop",
      os: "windows",
      depth: 20,
    },
  ]);

  try {
    const response = await axios.post(
      "https://api.dataforseo.com/v3/serp/google/organic/live/advanced",
      data,
      {
        headers: {
          Authorization: "Basic " + TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    let urls = [];
    if (
      !response.data.tasks[0].result[0].items ||
      response.data.tasks[0].result[0].spell != null
    ) {
      console.log("No results found for", query);
      return [];
    }

    response.data.tasks[0].result[0].items.forEach((item) => {
      console.log("Results found for", query);

      if (item.url != undefined) {
        console.log(item.url);
        urls.push(item.url);
      } else {
        console.log("No results found for", query);
      }
    });

    return urls;
  } catch (error) {
    console.log("Error fetching data:", error);
    return [];
  }
}

async function performSearches(start, limit) {
  const baseQueries = [
    { query: `"arpa order no `, suffix: `"`, numPosition: "middle" },
    { query: `"arpa order `, suffix: `"`, numPosition: "middle" },
    { query: `"ao `, suffix: `" arpa`, numPosition: "middle" },
  ];
  const results = [];

  for (let num = start; num <= limit; num++) {
    const searchPromises = baseQueries.map(
      ({ query, suffix = "", numPosition }) => {
        let searchQuery = query;
        if (numPosition === "end") {
          searchQuery += num;
        } else if (numPosition === "middle") {
          searchQuery = query + num + suffix;
        }
        return googleSearch(searchQuery);
      }
    );

    const urlsForCurrentNumber = await Promise.all(searchPromises);
    results.push(urlsForCurrentNumber.flat());
    console.log("Processed number", num);
  }

  console.log("Finished processing.");
  return results;
}

function getCleanFilename(i, counter, fileType) {
  const filename = `file${i}-${counter}.${fileType}`;
  return filename;
}

async function downloadFile(url, folder, i, counter, fileType) {
  const filename = getCleanFilename(i, counter, fileType);
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
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      },
    });

    // MIME Type Check
    const contentType = response.headers["content-type"];
    if (
      !contentType.includes("application/pdf") &&
      !contentType.includes("text/plain")
    ) {
      console.error("warning: File is missing a required MIME type");
    }

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

async function processUrls(nestedUrls, start, outputPath) {
  console.log("Processing URLs...");
  // console.log(nestedUrls);
  console.log(
    `Initial Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`
  );
  for (let i = 0; i < nestedUrls.length; i++) {
    console.log("Processing folder", i + start);
    // const folderName = path.join(
    //   __dirname,
    //   `output/pdfs-updated/folder${i + start}`
    // );
    const folderName = path.join(__dirname, `${outputPath}/folder${i + start}`);
    let counter = 0;
    for (let urls of nestedUrls[i]) {
      counter++;
      console.log("Processing URLs for folder", i + start);
      console.log("Processing URL", urls);
      // Extract file extension ignoring query parameters
      const urlPath = new URL(urls).pathname;
      const fileExtension = path.extname(urlPath);
      if (fileExtension.toLowerCase() == ".pdf") {
        const fileType = "pdf";
        console.log("Downloading", urls);
        await downloadFile(urls, folderName, i, counter, fileType).then(() => {
          console.log(`Downloaded ${urls} into ${folderName}`);
        });
      } else if (fileExtension.toLowerCase() == ".txt") {
        const fileType = "txt";
        console.log("Downloading", urls);
        await downloadFile(urls, folderName, i, counter, fileType).then(() => {
          console.log(`Downloaded ${urls} into ${folderName}`);
        });
      }
    }
  }
  console.log(
    `Final Memory Usage: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`
  );
}

// const readSavedResultsPathName = "searchResults.json";
//const readSavedResultsPathName2 = "searchResultsBackUp.json";
const readSavedResultsPathName3 = "./test/dummySearchResults.json";

const outputPath = "test/pdfs-updated";
(async () => {
  try {
    const start = 2201;
    const limit = 2700;

    const results = await performSearches(start, limit);
    // const data = await fsp.readFile(readSavedResultsPathName3, "utf8");
    // const results = JSON.parse(data);

    await fsp.writeFile(readSavedResultsPathName3, JSON.stringify(results));
    console.log("Results saved to: ", readSavedResultsPathName3);

    await processUrls(results, start, outputPath);
    console.log("URLs processed successfully.");
  } catch (error) {
    console.error("Failed to read or process URLs:", error);
  }
})();
