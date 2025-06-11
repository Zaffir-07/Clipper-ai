app.post("/clip-video", async (req, res) => {
  const { videoUrl, start, end } = req.body;

  if (!videoUrl || start == null || end == null) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const jobId = uuidv4();
  jobs[jobId] = { status: "processing", audio_url: null };

  // Async: kerjakan di belakang
  (async () => {
    const inputFile = `input-${jobId}.mp4`;
    const outputFile = `output-${jobId}.mp4`;

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

      jobs[jobId] = {
        status: "done",
        video_url: `https://your-domain.com/results/${outputFile}` // ganti sesuai real host kamu
      };

      fs.unlinkSync(inputFile);
      // Jangan hapus outputFile, biar bisa diakses
    } catch (err) {
      console.error("🔥 ERROR:", err.message);
      jobs[jobId] = { status: "error", error: err.message };
    }
  })();

  res.json({ status: "received", job_id: jobId });
});

app.get("/clip-video/result", (req, res) => {
  const { job_id } = req.query;
  if (!job_id || !jobs[job_id]) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(jobs[job_id]);
});
