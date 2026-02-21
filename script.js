const storageKey = "reel-notes-v2";

const seedReviews = [
  {
    id: crypto.randomUUID(),
    title: "Silence in the City: Why 'Drive' Still Feels Dangerous",
    film: "Drive",
    director: "Nicolas Winding Refn",
    rating: 8.9,
    watchDate: "2026-01-12",
    tags: ["neo-noir", "sound design", "minimalism"],
    excerpt:
      "A restrained thriller where silence and synth score are as expressive as dialogue.",
    body: "Refn's direction turns stillness into tension. Gosling's performance is almost sculptural: fewer words, more intent.\n\nWhat makes this film last is how it trusts visual rhythm. Every frame is composed with control, then punctured by sudden violence. It's beautiful, yes, but never comfortable.",
    createdAt: new Date("2026-01-13T09:12:00Z").toISOString(),
  },
  {
    id: crypto.randomUUID(),
    title: "The Brutal Optimism of 'The Martian'",
    film: "The Martian",
    director: "Ridley Scott",
    rating: 8.3,
    watchDate: "2026-02-02",
    tags: ["sci-fi", "humor", "survival"],
    excerpt:
      "A survival narrative that earns emotion through procedure and problem-solving.",
    body: "It's easy to call this movie crowd-pleasing, but the craftsmanship is precise. Every technical obstacle is a mini-screenwriting challenge, and the movie consistently chooses clarity over fake complexity.\n\nThe emotional core works because the film respects competence. Watching people do difficult things well is thrilling when the stakes are clean and human.",
    createdAt: new Date("2026-02-03T20:15:00Z").toISOString(),
  },
];

const els = {
  form: document.querySelector("#review-form"),
  list: document.querySelector("#reviews"),
  template: document.querySelector("#card-template"),
  featured: document.querySelector("#featured"),
  search: document.querySelector("#search"),
  sort: document.querySelector("#sort"),
  stats: document.querySelector("#stats"),
  modal: document.querySelector("#review-modal"),
  modalMeta: document.querySelector("#modal-meta"),
  modalTitle: document.querySelector("#modal-title"),
  modalExcerpt: document.querySelector("#modal-excerpt"),
  modalTags: document.querySelector("#modal-tags"),
  modalBody: document.querySelector("#modal-body"),
  closeModal: document.querySelector("#close-modal"),
};

const read = () => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    localStorage.setItem(storageKey, JSON.stringify(seedReviews));
    return [...seedReviews];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [...seedReviews];
  } catch {
    return [...seedReviews];
  }
};

const save = (reviews) => localStorage.setItem(storageKey, JSON.stringify(reviews));

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const readingMinutes = (text) => Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));

let reviews = read();

const renderStats = (items) => {
  const avg = items.length ? (items.reduce((sum, r) => sum + Number(r.rating), 0) / items.length).toFixed(1) : "0.0";
  const latest = items.length ? formatDate(items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt) : "—";
  els.stats.innerHTML = `
    <div class="stat"><b>${items.length}</b><p>Published Reviews</p></div>
    <div class="stat"><b>${avg}/10</b><p>Average Rating</p></div>
    <div class="stat"><b>${latest}</b><p>Last Published</p></div>
  `;
};

const renderFeatured = (items) => {
  if (!items.length) {
    els.featured.innerHTML = "";
    return;
  }

  const top = items.slice().sort((a, b) => Number(b.rating) - Number(a.rating))[0];
  els.featured.innerHTML = `
    <article class="featured">
      <strong>Featured Review</strong>
      <h3>${top.title}</h3>
      <p>${top.film} · Directed by ${top.director}</p>
      <p>${top.excerpt}</p>
      <small>${top.rating}/10 · ${readingMinutes(top.body)} min read</small>
    </article>
  `;
};

const renderTags = (container, tags) => {
  container.innerHTML = "";
  tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = `#${tag}`;
    container.appendChild(chip);
  });
};

const openModal = (review) => {
  els.modalMeta.textContent = `${review.film} · ${review.director} · Watched ${formatDate(review.watchDate)}`;
  els.modalTitle.textContent = review.title;
  els.modalExcerpt.textContent = review.excerpt;
  els.modalBody.textContent = review.body;
  renderTags(els.modalTags, review.tags);
  els.modal.showModal();
};

const filterAndSort = () => {
  const query = els.search.value.trim().toLowerCase();
  const sort = els.sort.value;

  let next = reviews.filter((r) => {
    if (!query) {
      return true;
    }

    return [r.title, r.film, r.director, r.excerpt, r.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  next = next.sort((a, b) => {
    if (sort === "rating") {
      return Number(b.rating) - Number(a.rating);
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return next;
};

const render = () => {
  const items = filterAndSort();
  els.list.innerHTML = "";
  renderStats(reviews);
  renderFeatured(reviews);

  if (!items.length) {
    els.list.innerHTML = '<p class="empty">No matching reviews found.</p>';
    return;
  }

  items.forEach((review) => {
    const node = els.template.content.cloneNode(true);
    node.querySelector(".card-meta").textContent = `${review.film} · ${review.director} · ${formatDate(review.createdAt)}`;
    node.querySelector(".card-title").textContent = review.title;
    node.querySelector(".card-excerpt").textContent = review.excerpt;
    node.querySelector(".rating-pill").textContent = `${review.rating}/10 · ${readingMinutes(review.body)} min read`;
    renderTags(node.querySelector(".card-tags"), review.tags);

    const btn = node.querySelector(".read-btn");
    btn.addEventListener("click", () => openModal(review));

    els.list.appendChild(node);
  });
};

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(els.form);
  const tags = String(data.get("tags") || "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);

  const review = {
    id: crypto.randomUUID(),
    title: String(data.get("title") || "").trim(),
    film: String(data.get("film") || "").trim(),
    director: String(data.get("director") || "").trim(),
    rating: Number(data.get("rating")),
    watchDate: String(data.get("watchDate") || "").trim(),
    tags,
    excerpt: String(data.get("excerpt") || "").trim(),
    body: String(data.get("body") || "").trim(),
    createdAt: new Date().toISOString(),
  };

  if (
    !review.title ||
    !review.film ||
    !review.director ||
    !review.watchDate ||
    !review.excerpt ||
    !review.body ||
    Number.isNaN(review.rating)
  ) {
    return;
  }

  reviews = [review, ...reviews];
  save(reviews);
  render();
  els.form.reset();
});

els.search.addEventListener("input", render);
els.sort.addEventListener("change", render);
els.closeModal.addEventListener("click", () => els.modal.close());
els.modal.addEventListener("click", (event) => {
  if (event.target === els.modal) {
    els.modal.close();
  }
});

render();
