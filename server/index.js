const http = require("http");
const path = require("path");
const fs = require("fs/promises");
const { createReadStream } = require("fs");
const { randomUUID } = require("crypto");

const PORT = process.env.PORT || 3000;
const dataPath = path.join(__dirname, "data", "reviews.json");
const clientPath = path.join(__dirname, "..", "client");

const mimeByExt = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const normalizeReviewInput = (payload = {}) => {
  const tags = Array.isArray(payload.tags)
    ? payload.tags
    : String(payload.tags || "")
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);

  return {
    title: String(payload.title || "").trim(),
    film: String(payload.film || "").trim(),
    director: String(payload.director || "").trim(),
    rating: Number(payload.rating),
    watchDate: String(payload.watchDate || "").trim(),
    tags: tags.slice(0, 6),
    excerpt: String(payload.excerpt || "").trim(),
    body: String(payload.body || "").trim(),
  };
};

const isValidReview = (review) => {
  if (
    !review.title ||
    !review.film ||
    !review.director ||
    !review.watchDate ||
    !review.excerpt ||
    !review.body ||
    Number.isNaN(review.rating)
  ) {
    return false;
  }

  return review.rating >= 1 && review.rating <= 10;
};

const readReviews = async () => {
  const raw = await fs.readFile(dataPath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
};

const writeReviews = async (reviews) => {
  await fs.writeFile(dataPath, `${JSON.stringify(reviews, null, 2)}\n`, "utf8");
};

const sendJson = (res, code, payload) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const serveStatic = async (req, res) => {
  const requested = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(requested).replace(/^([.][.][/\\])+/, "");
  const filePath = path.join(clientPath, safePath);

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error("Not file");
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeByExt[ext] || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  } catch {
    const fallback = path.join(clientPath, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    createReadStream(fallback).pipe(res);
  }
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/api/reviews" && req.method === "GET") {
      const reviews = await readReviews();
      sendJson(res, 200, reviews);
      return;
    }

    if (url.pathname === "/api/reviews" && req.method === "POST") {
      const payload = normalizeReviewInput(await readBody(req));
      if (!isValidReview(payload)) {
        sendJson(res, 400, { message: "Invalid review payload." });
        return;
      }

      const review = { id: randomUUID(), ...payload, createdAt: new Date().toISOString() };
      const reviews = await readReviews();
      await writeReviews([review, ...reviews]);
      sendJson(res, 201, review);
      return;
    }

    const idMatch = url.pathname.match(/^\/api\/reviews\/([^/]+)$/);
    if (idMatch && req.method === "PUT") {
      const payload = normalizeReviewInput(await readBody(req));
      if (!isValidReview(payload)) {
        sendJson(res, 400, { message: "Invalid review payload." });
        return;
      }

      const reviews = await readReviews();
      const index = reviews.findIndex((review) => review.id === idMatch[1]);
      if (index === -1) {
        sendJson(res, 404, { message: "Review not found." });
        return;
      }

      const updated = { ...reviews[index], ...payload };
      reviews[index] = updated;
      await writeReviews(reviews);
      sendJson(res, 200, updated);
      return;
    }

    if (idMatch && req.method === "DELETE") {
      const reviews = await readReviews();
      const index = reviews.findIndex((review) => review.id === idMatch[1]);
      if (index === -1) {
        sendJson(res, 404, { message: "Review not found." });
        return;
      }

      reviews.splice(index, 1);
      await writeReviews(reviews);
      res.writeHead(204);
      res.end();
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { message: "Server error.", detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
