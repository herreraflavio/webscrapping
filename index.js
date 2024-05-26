const fs = require("fs");
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
      console.log(item.url);
      urls.push(item.url);
    });

    return urls;
  } catch (error) {
    console.log("Error fetching data:", error);
    return [];
  }
}

async function performSearches() {
  const baseQueries = [
    { query: `"arpa order no `, suffix: `"`, numPosition: "middle" },
    { query: `"arpa order `, suffix: `"`, numPosition: "middle" },
    { query: `"ao `, suffix: `" arpa`, numPosition: "middle" },
  ];
  const results = [];
  const limit = 903;

  for (let num = 901; num <= limit; num++) {
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

function getCleanFilename(url) {
  const urlObject = new URL(url);
  const urlParams = new URLSearchParams(urlObject.search);
  let filename = urlParams.get("name");

  if (!filename) {
    filename = url.split("/").pop().split("?")[0].split("#")[0];
  }

  return filename;
}

async function downloadPdf(url, folder) {
  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
    });

    const filename = getCleanFilename(url);
    const filePath = path.join(folder, filename);

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`Error downloading from ${url}:`, error);
  }
}

async function processUrls(nestedUrls) {
  console.log("Processing URLs...");
  console.log(nestedUrls);
  for (let i = 0; i < nestedUrls.length; i++) {
    console.log("Processing folder", i + 901);
    const folderName = path.join(
      __dirname,
      `output/pdfs-updated/folder${i + 901}`
    );
    for (let urls of nestedUrls[i]) {
      console.log("Processing URLs for folder", i + 901);
      console.log("Processing URL", urls);
      if (urls.endsWith(".pdf")) {
        console.log("Downloading", urls);
        await downloadPdf(urls, folderName).then(() => {
          console.log(`Downloaded ${urls} into ${folderName}`);
        });
      }
    }
  }
}

(async () => {
  const results = await performSearches();

  await processUrls(results);
})();
