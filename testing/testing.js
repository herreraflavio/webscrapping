const axios = require("axios");
const fs = require("fs");

async function downloadPDF(url, outputPath) {
  try {
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
      },
      maxRedirects: 5, // This enables following up to 5 redirects
    });

    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Error downloading the PDF file:", error);
  }
}

// Example usage:
const pdfURL =
  "https://www.worldradiohistory.com/Archive-All-Music/Archive-RandR/1980s/1982/RR-1982-04-23.pdf";
const outputLocation = "RR-1982-04-23.pdf";

downloadPDF(pdfURL, outputLocation)
  .then(() => {
    console.log("PDF download complete!");
  })
  .catch((error) => {
    console.error("Failed to download PDF:", error);
  });
