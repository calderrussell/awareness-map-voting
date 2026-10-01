import { ASSETS } from "./static.js";

const PEOPLE = ["Anna", "Sydney", "Max", "Anania", "Calder", "Aleai", "Jake", "Tommy", "Zalea"];
const ALLOWED_ORIGINS = new Set([
  "https://awareness-map-votes.trussell.chatgpt.site",
  "https://calderrussell.github.io",
  "https://calderrussell.me",
  "http://calderrussell.me",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

function headers(origin) {
  const h = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"};
  if (ALLOWED_ORIGINS.has(origin)) {
    h["Access-Control-Allow-Origin"] = origin;
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type";
  }
  return h;
}
function json(value, status, origin) { return new Response(JSON.stringify(value), {status,headers:headers(origin)}); }
function validBallot(data) {
  if (!data || typeof data !== "object" || !/^[0-9a-f-]{36}$/i.test(data.voterId || "")) return false;
  if (!data.votes || Object.keys(data.votes).length !== PEOPLE.length) return false;
  return PEOPLE.every(name => {
    const vote = data.votes[name];
    return vote && Number.isInteger(vote.x) && Number.isInteger(vote.y) && vote.x >= 0 && vote.x <= 100 && vote.y >= 0 && vote.y <= 100;
  });
}
async function getResults(db, origin) {
  const [ballotCount, rows] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS total FROM ballots").first(),
    db.prepare("SELECT person, x, y FROM votes ORDER BY rowid ASC LIMIT 50000").all(),
  ]);
  const people = Object.fromEntries(PEOPLE.map(name => [name, {votes:[],average:null}]));
  for (const row of rows.results || []) {
    if (people[row.person]) people[row.person].votes.push({x:row.x,y:row.y});
  }
  for (const name of PEOPLE) {
    const list = people[name].votes;
    if (list.length) people[name].average = {
      x:list.reduce((sum, p) => sum + p.x, 0) / list.length,
      y:list.reduce((sum, p) => sum + p.y, 0) / list.length,
    };
  }
  return json({ballotCount:ballotCount?.total || 0,people}, 200, origin);
}
async function postVote(request, db, origin) {
  if (Number(request.headers.get("Content-Length") || 0) > 4096) return json({error:"Ballot is too large."},413,origin);
  let data;
  try { data = await request.json(); }
  catch { return json({error:"Invalid ballot."},400,origin); }
  if (!validBallot(data)) return json({error:"Place one valid dot for each person."},400,origin);
  const existing = await db.prepare("SELECT 1 FROM ballots WHERE voter_id = ?").bind(data.voterId).first();
  if (existing) return json({error:"This browser has already voted."},409,origin);
  const statements = [db.prepare("INSERT INTO ballots (voter_id, created_at) VALUES (?, ?)").bind(data.voterId,new Date().toISOString())];
  for (const name of PEOPLE) {
    const point = data.votes[name];
    statements.push(db.prepare("INSERT INTO votes (voter_id, person, x, y) VALUES (?, ?, ?, ?)").bind(data.voterId,name,point.x,point.y));
  }
  try { await db.batch(statements); }
  catch (error) {
    if (String(error).includes("UNIQUE constraint failed")) return json({error:"This browser has already voted."},409,origin);
    throw error;
  }
  return json({ok:true},201,origin);
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      if (!ALLOWED_ORIGINS.has(origin)) return new Response(null,{status:403});
      return new Response(null,{status:204,headers:headers(origin)});
    }
    const path = new URL(request.url).pathname;
    if (request.method === "GET" && ASSETS[path]) {
      const [body, type] = ASSETS[path];
      return new Response(body, {headers:{"Content-Type":type,"Cache-Control":path === "/" ? "no-store" : "public, max-age=300"}});
    }
    if (path === "/api/results" && request.method === "GET") {
      try { return await getResults(env.DB,origin); }
      catch (error) { console.error("Results failed",error); return json({error:"Results are temporarily unavailable."},503,origin); }
    }
    if (path === "/api/vote" && request.method === "POST") {
      if (!ALLOWED_ORIGINS.has(origin)) return json({error:"Origin not allowed."},403,origin);
      try { return await postVote(request,env.DB,origin); }
      catch (error) { console.error("Vote failed",error); return json({error:"Could not save this ballot. Please try again."},503,origin); }
    }
    return json({error:"Not found."},404,origin);
  },
};
