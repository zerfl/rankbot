require("dotenv").config();
const tmi = require("tmi.js");
const fetch = require("node-fetch");

const profileurl =
  "https://api.tracker.gg/api/v2/rocket-league/standard/profile/epic/tyrunk";

const loadRank = async () => {
  let result = {};
  try {
    const response = await fetch(profileurl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36",
      },
    });
    result = await response.json();
    return result;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

const parseRanks = async () => {
  const data = await loadRank();
  const playlistMapper = new Map();
  playlistMapper.set(10, "1v1");
  playlistMapper.set(11, "2v2");
  playlistMapper.set(13, "3v3");

  // console.log([...playlistMapper.keys()]);

  const playlists = data.data.segments.filter((segment) => {
    return (
      [...playlistMapper.keys()].indexOf(segment.attributes.playlistId) !== -1
    );
  });

  let rank = [];

  playlists.forEach((element) => {
		// console.log(element.stats.tier);
		const playlistName = playlistMapper.get(element.attributes.playlistId);
    rank.push(
      `${playlistName}: ${element.stats.tier.metadata.name} (${element.stats.rating.value})`
    );
  });

  return rank.join(" // ");
};

const options = {
  connection: {
    reconnect: true,
  },
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  // channels: ["tyrunk"],
  channels: ["tyrankbot"],
};

const client = new tmi.Client(options);

client.connect();
let lastMessageSent = Date.now();

client.on("message", async (channel, tags, message, self) => {
  if (self || !message.startsWith("!")) return;

  const args = message.slice(1).split(" ");
  const command = args.shift().toLowerCase();

  let now = Date.now();
  let delta = now - lastMessageSent;
  if (delta < 5000) return;

  if (command === "rank") {
    data = await parseRanks();
    client.say(channel, `@${tags.username} ${data}`);
    lastMessageSent = now;
  }
});
