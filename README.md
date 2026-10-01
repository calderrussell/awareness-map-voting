# Awareness Map

An eight-person voting page for internal and external self-awareness positions. The horizontal axis is internal self-awareness, and the vertical axis is external self-awareness. Visitors place one dot for each person, submit one ballot per browser, and see everyone's votes with an average for each person.

The GitHub Pages site is static. Shared votes require the companion API configured in `config.js`. The API must provide `POST /api/vote` and `GET /api/results`, with CORS access for this Pages origin. Browser storage remembers a ballot and a random voter ID; the server enforces voter ID uniqueness. This limits casual repeat voting but is not identity verification.

## Local preview

Run `python3 -m http.server 8080` in this directory and open `http://localhost:8080`.

## API contract

`POST /api/vote` accepts `{ "voterId": "uuid", "votes": { "Anna": {"x": 0-100, "y": 0-100}, ... } }` with all eight people. It returns `409` for a previously used voter ID.

`GET /api/results` returns `{ "ballotCount": 0, "people": { "Anna": { "votes": [{"x": 0, "y": 0}], "average": {"x": 0, "y": 0} }, ... } }`.
