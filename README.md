# Awareness Map

An eight-person voting page for internal and external self-awareness positions. The horizontal axis is internal self-awareness, and the vertical axis is external self-awareness. Visitors place one dot for each person, submit one ballot per browser, and see everyone's votes with an average for each person.

The GitHub Pages site is static. Shared votes use the companion API configured in `config.js`; its source and database schema are in `backend/`. The API provides `POST /api/vote` and `GET /api/results`, with CORS access for the Pages origin. Browser storage remembers a ballot and a random voter ID; the server enforces voter ID uniqueness. Clearing browser storage permits another ballot, so this is a casual one-ballot limit rather than identity verification.

The complete site is also live at [Awareness Map](https://awareness-map-votes.trussell.chatgpt.site/). The GitHub Pages deployment currently inherits `calderrussell.me` from the account's user site. That domain redirects to a separate Vercel site whose `/awareness-map-voting/` route returns 404. Fixing that domain route or the account-level Pages domain will make the GitHub Pages version accessible.

## Local preview

Run `python3 -m http.server 8080` in this directory and open `http://localhost:8080`.

## API contract

`POST /api/vote` accepts `{ "voterId": "uuid", "votes": { "Anna": {"x": 0-100, "y": 0-100}, ... } }` with all eight people. It returns `409` for a previously used voter ID.

`GET /api/results` returns `{ "ballotCount": 0, "people": { "Anna": { "votes": [{"x": 0, "y": 0}], "average": {"x": 0, "y": 0} }, ... } }`.
