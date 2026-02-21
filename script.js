const seedReviews = [
  {
    title: "Moonlight",
    genre: "Drama",
    rating: 9,
    review:
      "A deeply intimate coming-of-age story with poetic cinematography and extraordinary performances.",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Mad Max: Fury Road",
    genre: "Action",
    rating: 10,
    review:
      "Pure cinematic momentum — practical effects, kinetic pacing, and visual storytelling at full throttle.",
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

const storageKey = "reel-notes-reviews";
const reviewForm = document.querySelector("#review-form");
const reviewList = document.querySelector("#reviews");
const reviewTemplate = document.querySelector("#review-template");
const postCount = document.querySelector("#post-count");

const readReviews = () => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    localStorage.setItem(storageKey, JSON.stringify(seedReviews));
    return [...seedReviews];
  }

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(storageKey, JSON.stringify(seedReviews));
    return [...seedReviews];
  }
};

const saveReviews = (reviews) => {
  localStorage.setItem(storageKey, JSON.stringify(reviews));
};

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const renderReviews = (reviews) => {
  reviewList.innerHTML = "";

  if (!reviews.length) {
    reviewList.innerHTML = '<p class="empty">No reviews yet — publish your first one.</p>';
    postCount.textContent = "0 reviews";
    return;
  }

  reviews
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((review) => {
      const node = reviewTemplate.content.cloneNode(true);
      node.querySelector(".review-title").textContent = review.title;
      node.querySelector(".review-rating").textContent = `${review.rating}/10`;
      node.querySelector(".review-meta").textContent = `${review.genre} • ${formatDate(review.createdAt)}`;
      node.querySelector(".review-body").textContent = review.review;
      reviewList.appendChild(node);
    });

  postCount.textContent = `${reviews.length} review${reviews.length === 1 ? "" : "s"}`;
};

let reviews = readReviews();
renderReviews(reviews);

reviewForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(reviewForm);
  const title = formData.get("title") || document.querySelector("#title").value;
  const genre = formData.get("genre") || document.querySelector("#genre").value;
  const rating = Number(formData.get("rating") || document.querySelector("#rating").value);
  const reviewText = formData.get("review") || document.querySelector("#review").value;

  const newReview = {
    title: String(title).trim(),
    genre: String(genre).trim(),
    rating,
    review: String(reviewText).trim(),
    createdAt: new Date().toISOString(),
  };

  if (!newReview.title || !newReview.genre || !newReview.review || Number.isNaN(newReview.rating)) {
    return;
  }

  reviews = [newReview, ...reviews];
  saveReviews(reviews);
  renderReviews(reviews);
  reviewForm.reset();
});
