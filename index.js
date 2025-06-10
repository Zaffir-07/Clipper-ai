const express = require("express");
const axios = require("axios");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const { v4: uuidv4 } = require("uuid");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(express.json());

app.post("/clip-video", async (req, res) => {
  const { videoUrl, start, end } = req.body;

  if (!videoUrl || start == null || end == null) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const inputFile = `input-${uuidv4()}.mp4`;
  const outputFile = `output-${uuidv4()}.mp4`;

  try {
    const response = await axios({ url: videoUrl, method: "GET", responseType: "stream" });
    const writer = fs.createWriteStream(inputFile);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setStartTime(start)
        .setDuration(end - start)
        .output(outputFile)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    res.download(outputFile, () => {
      fs.unlinkSync(inputFile);
      fs.unlinkSync(outputFile);
    });
  } catch (err) {
    console.error("🔥 ERROR SAAT PROSES CLIP:", err.message);
console.error(err.stack);
res.status(500).json({ error: err.message });
  }
});
app.listen(3000, () => console.log("✅ API aktif di port 3000"));