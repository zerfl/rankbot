require("dotenv").config();
const tmi = require("tmi.js");
const fetch = require("node-fetch");

let lastMessageSent = 0;
let lastRankUpdate = 0;
let lastJSON = {};

const messageThrottleMs = 30000;
const updateThrottleMs = 30000;

const profileurl =
  `https://api.tracker.gg/api/v2/rocket-league/standard/profile/epic/${process.env.EPIC_USERNAME}`;

const loadRank = async () => {
  let result = {};

  let now = Date.now();
  let delta = now - lastRankUpdate;
  console.log(`delta update: ${delta}`);
  if (delta < updateThrottleMs) {
    return lastJSON;
  }
  lastRankUpdate = now;

  try {
    const response = await fetch(profileurl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36",
      },
    });
    result = await response.json();
    lastJSON = result;
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

  const playlists = data.data.segments.filter((segment) => {
    return (
      [...playlistMapper.keys()].indexOf(segment.attributes.playlistId) !== -1
    );
  });
  let rank = [];

  playlists.forEach((playlist) => {
    const playlistName = playlistMapper.get(playlist.attributes.playlistId);
    const division = playlist.stats.division.metadata.name.replace(
      "Division",
      "Div"
    );
    const deltaUp = playlist.stats.division.metadata.deltaUp;
    const deltaDown = playlist.stats.division.metadata.deltaDown;

    if (deltaUp && deltaDown) {
      rank.push(
        `${playlistName}: ${playlist.stats.tier.metadata.name} ${division} (${playlist.stats.rating.value} +${deltaUp} -${deltaDown})`
      );
    } else {
      rank.push(
        `${playlistName}: ${playlist.stats.tier.metadata.name} ${division} (${playlist.stats.rating.value})`
      );
    }
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
  channels: process.env.TWITCH_CHANNELS.split(","),
};

const client = new tmi.Client(options);

client.connect();

client.on("message", async (channel, tags, message, self) => {
  if (self || !message.startsWith("!")) return;

  const args = message.slice(1).split(" ");
  const command = args.shift().toLowerCase();

  let now = Date.now();
  let delta = now - lastMessageSent;
  if (delta < messageThrottleMs) return;

  if (command === "rank") {
    data = await parseRanks();
    client.say(channel, `@${tags.username} ${data}`);
    lastMessageSent = now;
  }
});

(async () => {
  await loadRank();
})();
