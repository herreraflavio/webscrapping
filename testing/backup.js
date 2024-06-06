// const fs = require("fs");
// const fs = require("fs").promises; // Ensure fs promises are correctly imported
const fs = require("fs");
const fsp = fs.promises; // Use this for promise-based async operations

const axios = require("axios");
const path = require("path");
const { URL, URLSearchParams } = require("url");
require("dotenv").config();
const TOKEN = process.env.TOKEN;

async function googleSearch(query) {
  const data = JSON.stringify([
    {
      keyword: query,
      location_code: 2840,
      language_code: "en",
      device: "desktop",
      os: "windows",
      depth: 10,
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
    if (!response.data.tasks[0].result[0].items) {
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

function getCleanFilename(i, counter) {
  const filename = `file${i}-${counter}.pdf`;

  return filename;
}

// async function downloadPdf(url, folder, i, counter) {
//   try {
//     if (!fs.existsSync(folder)) {
//       fs.mkdirSync(folder, { recursive: true });
//     }

//     const response = await axios({
//       method: "GET",
//       url: url,
//       responseType: "stream",
//     });

//     const filename = getCleanFilename(i, counter);
//     const filePath = path.join(folder, filename);

//     const writer = fs.createWriteStream(filePath);
//     response.data.pipe(writer);

//     return new Promise((resolve, reject) => {
//       writer.on("finish", resolve);
//       writer.on("error", reject);
//     });
//   } catch (error) {
//     console.error(`Error downloading from ${url}:`, error);
//   }
// }
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
      timeout: 30000, // Timeout set for 30 seconds
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(`File downloaded successfully: ${filePath}`);
        resolve(`Downloaded: ${filePath}`);
      });
      writer.on("error", (err) => {
        console.error(`Error writing file: ${filePath}`, err);
        writer.close(); // Ensure the stream is closed on error.
        reject(`Failed to download: ${filePath}`);
      });
    });
  } catch (error) {
    console.error(`Error downloading from ${url}:`, error);
    // Return an error message instead of throwing the error, to continue processing subsequent URLs.
    return `Error downloading from ${url}: ${error.message}`;
  }
}
// async function downloadPdf(url, folder, i, counter) {
//   try {
//     console.log("Downloading", url);
//   } catch (error) {
//     console.error(`Error downloading from ${url}:`, error);
//   }
// }

async function processUrls(nestedUrls, start) {
  console.log("Processing URLs...");
  console.log(nestedUrls);
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
}

// (async () => {
//   const start = 1201;
//   const limit = 1203;
//   const results = await performSearches(start, limit);

//   await processUrls(results, start);
// })();

(async () => {
  const start = 1701;
  const limit = 2200;
  try {
    const results = await performSearches(start, limit);
    await fsp.writeFile("searchResults.json", JSON.stringify(results));
    console.log("Results saved to searchResults.json");
  } catch (error) {
    console.error("Failed to perform search or save results:", error);
  }
})();

// const readSavedResultsPathName = "searchResults.json";
// const readSavedResultsPathName2 = "searchResultsBackUp.json";

// (async () => {
//   try {
//     // Read the JSON file containing the URLs
//     const data = await fsp.readFile(readSavedResultsPathName, "utf8");
//     const results = JSON.parse(data); // Parse the JSON data into an array

//     const start = 1201; // Start value used for folder naming or similar logic in processUrls

//     // Process the URLs read from the JSON file
//     await processUrls(results, start);
//     console.log("URLs processed successfully.");
//   } catch (error) {
//     console.error("Failed to read or process URLs:", error);
//   }
// })();
