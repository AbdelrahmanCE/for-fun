# for-fun

Reel Notes now uses a separated frontend/backend structure:

- `client/` contains the UI (`index.html`, `styles.css`, `script.js`)
- `server/` contains the Node backend and persisted review data API

## Run

```bash
npm start
```

Then open `http://localhost:3000`.

## API

- `GET /api/reviews`
- `POST /api/reviews`
- `PUT /api/reviews/:id`
- `DELETE /api/reviews/:id`
