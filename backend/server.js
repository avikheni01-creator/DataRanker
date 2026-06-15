// server.js — Express app: CORS allow-all, mount routes, listen.

const express = require("express");
const cors = require("cors");

const pipelineRouter = require("./routes/pipeline");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: "*",
    allowedHeaders: "*",
  })
);

app.use(pipelineRouter);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Stock Ranking Pipeline API listening on port ${PORT}`);
});

module.exports = app;
