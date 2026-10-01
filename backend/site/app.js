const PEOPLE = ["Anna", "Sydney", "Max", "Anania", "Calder", "Aleai", "Jake", "Tommy"];
const STORAGE_KEY = "awareness-map-ballot-v1";
const VOTER_KEY = "awareness-map-voter-v1";
const API = (window.AWARENESS_API_URL || "").replace(/\/$/, "");
const $ = id => document.getElementById(id);
let positions = readJSON(STORAGE_KEY, {});
let current = 0;
let hasSubmitted = false;
let resultsLoaded = false;

function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function savePositions() { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); }
function voterId() {
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    id = `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}
function clamp(n) { return Math.max(0, Math.min(100, n)); }
function showView(view) {
  const results = view === "results";
  $("voteView").hidden = results;
  $("resultsView").hidden = !results;
  $("voteTab").classList.toggle("active", !results);
  $("resultsTab").classList.toggle("active", results);
  $("voteTab").setAttribute("aria-current", results ? "false" : "page");
  $("resultsTab").setAttribute("aria-current", results ? "page" : "false");
  if (results) loadResults();
}
function renderBallot() {
  const name = PEOPLE[current];
  const p = positions[name];
  $("currentName").textContent = name;
  $("votePlot").setAttribute("aria-label", `Position ${name} on the awareness grid. Arrow keys move the dot.`);
  $("chartInstruction").textContent = hasSubmitted ? "Your ballot has been submitted." : "Tap or click the grid to place a dot.";
  $("voteDot").hidden = !p;
  if (p) {
    $("voteDot").style.left = `${p.x}%`;
    $("voteDot").style.top = `${100 - p.y}%`;
    $("positionText").textContent = `Internal ${p.x} · External ${p.y}`;
  } else $("positionText").textContent = "No position selected";
  $("peopleList").replaceChildren(...PEOPLE.map((person, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `person-button${index === current ? " selected" : ""}${positions[person] ? " done" : ""}`;
    button.setAttribute("aria-current", index === current ? "true" : "false");
    button.innerHTML = `<span class="person-index">${String(index + 1).padStart(2,"0")}</span><span>${person}</span><span class="person-check" aria-label="${positions[person] ? "Placed" : "Not placed"}">${positions[person] ? "✓" : ""}</span>`;
    button.addEventListener("click", () => { current = index; renderBallot(); });
    return button;
  }));
  const count = PEOPLE.filter(person => positions[person]).length;
  $("progressText").textContent = `${count} of 8 placed`;
  $("submitButton").disabled = count !== 8 || hasSubmitted;
  $("submitButton").textContent = hasSubmitted ? "Ballot submitted" : "Submit all dots";
  $("votePlot").style.pointerEvents = hasSubmitted ? "none" : "auto";
}
function place(x, y) {
  if (hasSubmitted) return;
  positions[PEOPLE[current]] = { x: Math.round(clamp(x)), y: Math.round(clamp(y)) };
  savePositions();
  $("voteMessage").textContent = "";
  renderBallot();
}
function placeFromPointer(event) {
  const rect = $("votePlot").getBoundingClientRect();
  place((event.clientX - rect.left) / rect.width * 100, (rect.bottom - event.clientY) / rect.height * 100);
}
function moveWithKeys(event) {
  if (hasSubmitted || !["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Enter"," "].includes(event.key)) return;
  event.preventDefault();
  const p = positions[PEOPLE[current]] || {x:50,y:50};
  if (event.key === "ArrowUp") place(p.x, p.y + 2);
  if (event.key === "ArrowDown") place(p.x, p.y - 2);
  if (event.key === "ArrowLeft") place(p.x - 2, p.y);
  if (event.key === "ArrowRight") place(p.x + 2, p.y);
  if (event.key === "Enter" || event.key === " ") place(p.x, p.y);
}
async function submitBallot() {
  if (hasSubmitted || PEOPLE.some(name => !positions[name])) return;
  if (!API) { $("voteMessage").textContent = "The shared vote service is not connected yet. Your dots are saved in this browser."; return; }
  const button = $("submitButton");
  button.disabled = true;
  button.textContent = "Submitting…";
  $("voteMessage").textContent = "";
  try {
    const response = await fetch(`${API}/api/vote`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({voterId:voterId(),votes:positions})});
    const body = await response.json().catch(() => ({}));
    if (response.status === 409) {
      hasSubmitted = true;
      localStorage.setItem("awareness-map-submitted-v1", "yes");
      $("voteMessage").textContent = "This browser has already submitted a ballot.";
      renderBallot();
      return;
    }
    if (!response.ok) throw new Error(body.error || "Could not submit. Please try again.");
    hasSubmitted = true;
    localStorage.setItem("awareness-map-submitted-v1", "yes");
    resultsLoaded = false;
    renderBallot();
    showView("results");
  } catch (error) {
    $("voteMessage").textContent = error.message || "Could not submit. Please try again.";
    renderBallot();
  }
}
function plotDot(className, x, y) {
  const dot = document.createElement("span");
  dot.className = className;
  dot.style.left = `${clamp(x)}%`;
  dot.style.top = `${100 - clamp(y)}%`;
  return dot;
}
function renderResults(data) {
  const total = Number(data.ballotCount) || 0;
  $("ballotCount").textContent = `${total} ${total === 1 ? "ballot" : "ballots"}`;
  $("resultsStatus").hidden = true;
  $("resultsGrid").replaceChildren(...PEOPLE.map(name => {
    const entry = data.people?.[name] || {votes:[],average:null};
    const card = document.createElement("article");
    card.className = "result-card";
    const heading = document.createElement("h3"); heading.textContent = name;
    const count = document.createElement("p"); count.className = "count"; count.textContent = `${entry.votes.length} ${entry.votes.length === 1 ? "dot" : "dots"}`;
    const plot = document.createElement("div"); plot.className = "mini-plot";
    plot.setAttribute("role", "img");
    plot.setAttribute("aria-label", entry.average ? `${name}: ${entry.votes.length} votes, average internal ${Math.round(entry.average.x)}, external ${Math.round(entry.average.y)}` : `${name}: no votes yet`);
    if (entry.votes.length) {
      entry.votes.forEach(vote => plot.append(plotDot("mini-vote", vote.x, vote.y)));
      plot.append(plotDot("mini-avg", entry.average.x, entry.average.y));
    } else { const empty = document.createElement("span"); empty.className = "empty-chart"; empty.textContent = "No votes yet"; plot.append(empty); }
    const axis = document.createElement("div"); axis.className = "axis-mini"; axis.textContent = "INTERNAL →";
    const average = document.createElement("p"); average.className = "average-text";
    average.textContent = entry.average ? `Average: ${Math.round(entry.average.x)} internal · ${Math.round(entry.average.y)} external` : "Average appears after the first vote";
    card.append(heading, count, plot, axis, average);
    return card;
  }));
}
async function loadResults() {
  if (resultsLoaded) return;
  $("resultsStatus").hidden = false;
  $("resultsStatus").textContent = "Loading results…";
  if (!API) { $("resultsStatus").textContent = "The shared vote service is not connected yet."; return; }
  try {
    const response = await fetch(`${API}/api/results`, {cache:"no-store"});
    if (!response.ok) throw new Error("Results are temporarily unavailable. Try refreshing.");
    const data = await response.json();
    renderResults(data);
    resultsLoaded = true;
  } catch (error) { $("resultsStatus").textContent = error.message || "Results are temporarily unavailable. Try refreshing."; }
}
$("voteTab").addEventListener("click", () => showView("vote"));
$("resultsTab").addEventListener("click", () => showView("results"));
$("refreshButton").addEventListener("click", () => { resultsLoaded = false; loadResults(); });
$("votePlot").addEventListener("pointerdown", placeFromPointer);
$("votePlot").addEventListener("keydown", moveWithKeys);
$("nextButton").addEventListener("click", () => { current = (current + 1) % PEOPLE.length; renderBallot(); });
$("submitButton").addEventListener("click", submitBallot);
hasSubmitted = localStorage.getItem("awareness-map-submitted-v1") === "yes";
renderBallot();
if (hasSubmitted) showView("results");
