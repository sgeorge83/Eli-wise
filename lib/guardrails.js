const BIBLE_BOOKS = [
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua", "judges", "ruth",
  "samuel", "kings", "chronicles", "ezra", "nehemiah", "esther", "job", "psalm", "psalms",
  "proverbs", "ecclesiastes", "song", "isaiah", "jeremiah", "lamentations", "ezekiel", "daniel",
  "hosea", "joel", "amos", "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah",
  "haggai", "zechariah", "malachi", "matthew", "mark", "luke", "john", "acts", "romans",
  "corinthians", "galatians", "ephesians", "philippians", "colossians", "thessalonians",
  "timothy", "titus", "philemon", "hebrews", "james", "peter", "jude", "revelation",
];

const THEOLOGY_TERMS = [
  "bible", "scripture", "gospel", "jesus", "christ", "god", "lord", "holy spirit", "trinity",
  "salvation", "sin", "grace", "faith", "repentance", "prayer", "worship", "church", "pastor",
  "disciple", "apostle", "prophet", "covenant", "resurrection", "heaven", "hell", "eternal",
  "atonement", "justification", "sanctification", "baptism", "communion", "eucharist",
  "theology", "doctrine", "creed", "catechism", "parable", "psalm", "verse", "testament",
  "old testament", "new testament", "messiah", "angel", "demon", "satan", "devil", "creation",
  "fall", "adam", "eve", "moses", "david", "paul", "peter", "mary", "cross", "crucifixion",
  "forgiveness", "mercy", "righteousness", "holiness", "commandment", "ten commandments",
  "sermon on the mount", "beatitudes", "prophecy", "revelation", "apocalypse", "eschatology",
  "kingdom of god", "kingdom of heaven", "shepherd", "lamb", "savior", "redeemer", "lord's prayer",
  "our father", "hallelujah", "amen", "blessing", "fasting", "tithe", "offering", "evangelism",
  "mission", "apologetics", "hermeneutics", "exegesis", "canon", "inerrancy", "inspiration",
];

const OFF_TOPIC_PATTERNS = [
  /\b(weather|forecast|temperature)\b/i,
  /\b(recipe|cook|bake|ingredient)\b/i,
  /\b(stock|crypto|bitcoin|investment|trading)\b/i,
  /\b(python|javascript|coding|programming|software|debug)\b/i,
  /\b(movie|netflix|celebrity|gossip)\b/i,
  /\b(football|basketball|soccer|cricket|sports score)\b/i,
  /\b(homework|math problem|algebra|calculus)\b/i,
  /\b(write (me )?(an )?email|resume|cover letter)\b/i,
  /\b(travel itinerary|hotel|flight booking)\b/i,
];

const SCRIPTURE_REFERENCE =
  /\b(?:1|2|3)?\s?(?:genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalm?s?|proverbs|ecclesiastes|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?\b/i;

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s':-]/g, " ").replace(/\s+/g, " ").trim();
}

function countMatches(text, terms) {
  let score = 0;
  for (const term of terms) {
    if (text.includes(term)) score += 1;
  }
  return score;
}

export function isBibleOrTheologyQuestion(message) {
  const text = normalize(message);

  if (!text) return false;

  if (SCRIPTURE_REFERENCE.test(message)) return true;

  for (const pattern of OFF_TOPIC_PATTERNS) {
    if (pattern.test(message)) {
      const theologyScore = countMatches(text, THEOLOGY_TERMS);
      const bibleBookScore = BIBLE_BOOKS.filter((book) => text.includes(book)).length;
      if (theologyScore === 0 && bibleBookScore === 0) {
        return false;
      }
    }
  }

  const theologyScore = countMatches(text, THEOLOGY_TERMS);
  const bibleBookScore = BIBLE_BOOKS.filter((book) => text.includes(book)).length;

  if (theologyScore >= 1 || bibleBookScore >= 1) return true;

  const scopeQuestions = [
    "what can you help",
    "what do you do",
    "who are you",
    "what is eli-wise",
    "what topics",
    "what questions",
  ];

  if (scopeQuestions.some((phrase) => text.includes(phrase))) return true;

  return false;
}

export const REFUSAL_MESSAGE =
  "I am ELI-WISE, a Bible and Christian theology assistant. I can only answer questions related to Scripture, biblical interpretation, and orthodox Christian theology. Your question appears to be outside that scope. Please ask about the Bible, a passage, a doctrine, prayer, salvation, or another faith-related topic.";
