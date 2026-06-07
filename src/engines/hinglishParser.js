/**
 * HINGLISH FEEDBACK PARSER ENGINE
 * Parses mix Hindi-English sales notes to extract structured data.
 * Built from real entries in the team's Google Sheets.
 *
 * Detects: Broker, Capital, Experience, Competitors, Dispositions,
 *          Follow-up times, and Objections from free-text feedback.
 */

// ══════════════════════════════════════════════════════
// BROKER DETECTION
// ══════════════════════════════════════════════════════

const BROKER_PATTERNS = [
  { key: 'zerodha',    regex: /\b(zerodha|zrodha|zerodh)\b/i },
  { key: 'angel_one',  regex: /\b(angel\s*one|angel|angelone)\b/i },
  { key: 'groww',      regex: /\b(groww?)\b/i },
  { key: 'upstox',     regex: /\b(upstox|upstock)\b/i },
  { key: 'dhan',       regex: /\b(dhan)\b/i },
  { key: 'fyers',      regex: /\b(fyers|fyer)\b/i },
  { key: '5paisa',     regex: /\b(5\s*paisa|5paisa)\b/i },
  { key: 'alice_blue', regex: /\b(alice\s*blue|aliceblue)\b/i },
  { key: 'kotak',      regex: /\b(kotak)\b/i },
  { key: 'icici',      regex: /\b(icici)\b/i },
  { key: 'hdfc',       regex: /\b(hdfc)\b/i },
  { key: 'sbi',        regex: /\b(sbi|sbi\s*mo)\b/i },
  { key: 'motilal',    regex: /\b(motilal|motilal\s*oswal)\b/i },
  { key: 'sharekhan',  regex: /\b(sharekhan|share\s*khan)\b/i },
];

export function detectBrokers(text) {
  if (!text) return [];
  const found = [];
  for (const b of BROKER_PATTERNS) {
    if (b.regex.test(text)) found.push(b.key);
  }
  return found;
}

// ══════════════════════════════════════════════════════
// CAPITAL DETECTION
// Handles: "1 cr", "2 lakh", "30K", "50000", "4.20 lakh / 2.70"
// ══════════════════════════════════════════════════════

const CAPITAL_PATTERNS = [
  // "1 cr" / "1.5 crore" / "2cr"
  { regex: /(\d+(?:\.\d+)?)\s*(?:cr|crore|crores)/i, multiplier: 10000000 },
  // "2 lakh" / "4.20 lakh" / "2lakh"
  { regex: /(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs|lacs)/i, multiplier: 100000 },
  // "30K" / "60k" / "25k"
  { regex: /(\d+(?:\.\d+)?)\s*k\b/i, multiplier: 1000 },
  // plain numbers >= 1000 that likely represent capital
  { regex: /\b(\d{4,})\b/, multiplier: 1 },
];

export function detectCapital(text) {
  if (!text) return null;

  // Try patterns in order of magnitude (cr > lakh > k > plain)
  for (const p of CAPITAL_PATTERNS) {
    const m = text.match(p.regex);
    if (m) {
      const val = parseFloat(m[1]) * p.multiplier;
      return {
        raw: m[0],
        numeric: val,
        formatted: formatIndianCurrency(val),
      };
    }
  }
  return null;
}

function formatIndianCurrency(num) {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(num % 10000000 === 0 ? 0 : 1)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)} Lakh`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num}`;
}

// ══════════════════════════════════════════════════════
// TRADING EXPERIENCE DETECTION
// ══════════════════════════════════════════════════════

const EXPERIENCE_PATTERNS = [
  { key: 'manual_trader',   regex: /\b(manual\s*(?:trading|dono|me)\s*(?:krta|karta|krti|karti)?)\b/i, label: 'Manual Trader' },
  { key: 'algo_user',       regex: /\b(algo\s*(?:use|trading|se|software))\b/i, label: 'Algo User' },
  { key: 'intraday',        regex: /\b(intraday|intra\s*day)\b/i, label: 'Intraday Trader' },
  { key: 'option_trader',   regex: /\b(option|options|f&o|fno)\b/i, label: 'Options/F&O' },
  { key: 'no_algo',         regex: /\b(algo\s*(?:use\s*ni|nhi|nahi|ni)\s*(?:kiya|krti|krta)?|algo\s*ni)\b/i, label: 'No Algo Experience' },
  { key: 'beginner',        regex: /\b(beginner|new\s*(?:hai|h)|abhi\s*start|student)\b/i, label: 'Beginner' },
  { key: 'property_dealer', regex: /\b(property\s*dealer|business\s*(?:krta|karta|man))\b/i, label: 'Businessman/Dealer' },
];

export function detectExperience(text) {
  if (!text) return [];
  const found = [];
  for (const e of EXPERIENCE_PATTERNS) {
    if (e.regex.test(text)) found.push({ key: e.key, label: e.label });
  }
  return found;
}

// ══════════════════════════════════════════════════════
// COMPETITOR DETECTION
// ══════════════════════════════════════════════════════

const COMPETITOR_PATTERNS = [
  { key: 'tradetron',  regex: /\b(tradetron)\b/i, label: 'Tradetron' },
  { key: 'quantiply',  regex: /\b(quantiply)\b/i, label: 'Quantiply' },
  { key: 'algobaba',   regex: /\b(algobaba)\b/i, label: 'Algobaba' },
  { key: 'sensibull',  regex: /\b(sensibull)\b/i, label: 'Sensibull' },
  { key: 'streak',     regex: /\b(streak)\b/i, label: 'Streak (Zerodha)' },
  { key: 'algotest',   regex: /\b(algotest)\b/i, label: 'AlgoTest' },
  // Generic: "already software se kam kar rha hai"
  { key: 'generic_software', regex: /\b(already\s*software|software\s*(?:se|use|kam))\b/i, label: 'Using Some Software' },
];

export function detectCompetitors(text) {
  if (!text) return [];
  const found = [];
  for (const c of COMPETITOR_PATTERNS) {
    if (c.regex.test(text)) found.push({ key: c.key, label: c.label });
  }
  return found;
}

// ══════════════════════════════════════════════════════
// DISPOSITION / QUICK STATUS DETECTION
// ══════════════════════════════════════════════════════

const DISPOSITION_PATTERNS = [
  { key: 'busy',            regex: /\bBUSY\b/i, label: 'Busy' },
  { key: 'npc',             regex: /\bNPC\b/i, label: 'Not a Potential Client' },
  { key: 'wrong_inquiry',   regex: /\b(wrong\s*inquiry|wrong\s*enquiry|nai\s*kr?te\s*trading)\b/i, label: 'Wrong Inquiry' },
  { key: 'no_whatsapp',     regex: /\b(no\s*whats?app?|no\s*whatsup)\b/i, label: 'No WhatsApp' },
  { key: 'not_interested',  regex: /\b(not\s*interested|interest\s*nahi|interest\s*ni)\b/i, label: 'Not Interested' },
  { key: 'unreachable',     regex: /\b(unreachable|not\s*reachable|switch\s*off|company\s*no)\b/i, label: 'Unreachable' },
  { key: 'call_back',       regex: /\b(call\s*back|callback)\b/i, label: 'Call Back' },
];

export function detectDisposition(text) {
  if (!text) return null;
  for (const d of DISPOSITION_PATTERNS) {
    if (d.regex.test(text)) return { key: d.key, label: d.label };
  }
  return null;
}

// ══════════════════════════════════════════════════════
// OBJECTION / PAIN POINT DETECTION
// ══════════════════════════════════════════════════════

const OBJECTION_PATTERNS = [
  { key: 'had_losses',     regex: /\b(loss|losses|loss\s*(?:kiya|hua|ho|hui)|advisory\s*loss|handling\s*loss)\b/i, label: 'Had Losses', battlecard: 'We don\'t manage your money — you control everything. Our algo runs on YOUR demat, YOUR rules.' },
  { key: 'too_expensive',  regex: /\b(expensive|costly|mehnga|budget\s*nahi|capital\s*(?:nahi|ni|without|kam))\b/i, label: 'Budget Concern', battlecard: 'Start with our Starter plan at ₹4,999/mo. Even with 25K capital, option selling strategies can work.' },
  { key: 'no_time',        regex: /\b(time\s*(?:nahi|ni|nai)|jyda\s*time\s*nai|busy\s*rehta)\b/i, label: 'No Time', battlecard: 'That\'s exactly why algo works — it runs 24/7 automatically. Set it once, monitor from your phone.' },
  { key: 'trust_issues',   regex: /\b(trust|scam|fraud|profit\s*sharing|fake)\b/i, label: 'Trust Issues', battlecard: 'We are SEBI registered. No profit sharing, no account access. Software runs on your own broker.' },
  { key: 'needs_proof',    regex: /\b(proof|result|performance|backtest|live\s*result)\b/i, label: 'Wants Proof', battlecard: 'We\'ll show you live results in the demo. Also sharing backtested performance reports.' },
];

export function detectObjections(text) {
  if (!text) return [];
  const found = [];
  for (const o of OBJECTION_PATTERNS) {
    if (o.regex.test(text)) found.push({ key: o.key, label: o.label, battlecard: o.battlecard });
  }
  return found;
}

// ══════════════════════════════════════════════════════
// FOLLOW-UP TIME PARSER
// Parses Hinglish time expressions into actual dates
// ══════════════════════════════════════════════════════

export function parseFollowUpTime(text) {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  const now = new Date();

  // "kal" = tomorrow
  const isTomorrow = /\b(kal|tomorrow|tommrow|tmrw)\b/i.test(t);
  // "perso" / "parso" = day after tomorrow
  const isDayAfter = /\b(pers?o|pars?o|day\s*after)\b/i.test(t);
  // "aaj" = today
  const isToday = /\b(aaj|today|abhi)\b/i.test(t);

  let targetDate = new Date(now);
  if (isTomorrow) targetDate.setDate(targetDate.getDate() + 1);
  if (isDayAfter) targetDate.setDate(targetDate.getDate() + 2);

  // Try to extract time: "5-6 bje", "9 bje", "3:30", "10 am"
  const timePatterns = [
    // "5-6 bje" / "5 bje" / "5 baje"
    { regex: /(\d{1,2})(?:\s*-\s*\d{1,2})?\s*(?:bje|baje|baj)\b/i, type: 'bje' },
    // "3:30" / "3:30 pm"
    { regex: /(\d{1,2}):(\d{2})\s*(?:pm|am)?/i, type: 'clock' },
    // "10 am" / "4 pm"
    { regex: /(\d{1,2})\s*(am|pm)/i, type: 'ampm' },
    // "subh 9" / "morning 9"
    { regex: /(?:subh|subah|morning|shaam|sham|evening)\s*(\d{1,2})/i, type: 'period' },
    // Just a number after kal: "kal 5"
    { regex: /(?:kal|tomorrow)\s+(\d{1,2})\b/i, type: 'bje' },
  ];

  let hours = 10; // default: 10 AM
  let minutes = 0;
  let timeFound = false;

  for (const tp of timePatterns) {
    const m = t.match(tp.regex);
    if (m) {
      timeFound = true;
      if (tp.type === 'clock') {
        hours = parseInt(m[1]);
        minutes = parseInt(m[2]);
        if (/pm/i.test(m[0]) && hours < 12) hours += 12;
      } else if (tp.type === 'ampm') {
        hours = parseInt(m[1]);
        if (m[2].toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (m[2].toLowerCase() === 'am' && hours === 12) hours = 0;
      } else if (tp.type === 'bje') {
        hours = parseInt(m[1]);
        // Indian context: if <=6 it's likely PM (evening), if >6 and <=11 it's AM
        if (hours >= 1 && hours <= 6) hours += 12;
      } else if (tp.type === 'period') {
        hours = parseInt(m[1]);
        if (/subh|subah|morning/i.test(m[0])) {
          // morning — keep as-is
        } else {
          // shaam/evening — add 12
          if (hours < 12) hours += 12;
        }
      }
      break;
    }
  }

  // "subh" without number = 9 AM
  if (!timeFound && /\b(subh|subah|morning)\b/i.test(t)) { hours = 9; timeFound = true; }
  // "shaam" without number = 5 PM
  if (!timeFound && /\b(shaam|sham|evening)\b/i.test(t)) { hours = 17; timeFound = true; }
  // "gmeet" / "meet" = use the time if found, else default
  if (/\b(gmeet|meet|google\s*meet)\b/i.test(t)) {
    // already parsed time above, just flag it
  }

  // Only return if we detected at least a day reference or a time
  if (isTomorrow || isDayAfter || isToday || timeFound) {
    targetDate.setHours(hours, minutes, 0, 0);
    return {
      date: targetDate,
      iso: targetDate.toISOString(),
      display: targetDate.toLocaleString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: true
      }),
      confidence: (isTomorrow || isDayAfter || isToday) && timeFound ? 'high' : 'medium',
    };
  }

  return null;
}

// ══════════════════════════════════════════════════════
// MASTER PARSER — Run all detections on a text input
// ══════════════════════════════════════════════════════

export function parseHinglishFeedback(feedbackText, followUpText = '') {
  const results = {
    brokers: detectBrokers(feedbackText),
    capital: detectCapital(feedbackText),
    experience: detectExperience(feedbackText),
    competitors: detectCompetitors(feedbackText),
    disposition: detectDisposition(feedbackText),
    objections: detectObjections(feedbackText),
    followUpTime: parseFollowUpTime(followUpText || feedbackText),
    hasSuggestions: false,
  };

  // Mark if there are any suggestions to show
  results.hasSuggestions = (
    results.brokers.length > 0 ||
    results.capital !== null ||
    results.experience.length > 0 ||
    results.competitors.length > 0 ||
    results.objections.length > 0 ||
    results.followUpTime !== null
  );

  return results;
}

// ══════════════════════════════════════════════════════
// 10x AI MAGIC PARSER — Extracts all fields from a single text block
// ══════════════════════════════════════════════════════

export function magicParseLeadText(text) {
  if (!text) return null;
  const t = text.trim();

  // 1. Extract Mobile Phone: matches 10 consecutive digits (optionally with +91 or spaces)
  const phoneRegex = /(?:\+?91[\s-]?)?([6789]\d{9})\b/;
  const phoneMatch = t.match(phoneRegex);
  const phone = phoneMatch ? phoneMatch[0] : '';

  // 2. Extract Capital using detectCapital
  const capObj = detectCapital(t);
  const capital = capObj ? capObj.raw : '';

  // 3. Extract Broker
  const brokers = detectBrokers(t);
  const broker = brokers.length > 0 ? brokers[0] : '';

  // 4. Extract Experience
  const expList = detectExperience(t);
  const trading_experience = expList.length > 0 ? expList[0].key : '';

  // 5. Extract City from a robust list
  const cities = ['jodhpur', 'jaipur', 'delhi', 'mumbai', 'udaipur', 'pune', 'bangalore', 'kolkata', 'chennai', 'noida', 'gurgaon', 'ahmedabad', 'surat', 'indore', 'bhopal', 'patna', 'lucknow', 'hyderabad', 'chandigarh', 'amritsar', 'ludhiana', 'kota', 'dehradun', 'guwahati', 'kochi', 'patiala', 'jalandhar'];
  let city = '';
  for (const c of cities) {
    const cityRegex = new RegExp(`\\b${c}\\b`, 'i');
    if (cityRegex.test(t)) {
      city = c.charAt(0).toUpperCase() + c.slice(1);
      break;
    }
  }

  // 6. Extract Follow-up Date & Note: search for date-like words (kal, parso, kal sham 5 baje)
  const followUpObj = parseFollowUpTime(t);
  let follow_up_note = '';
  if (followUpObj) {
    const matchNote = t.match(/(?:bola|bol|bol rha|bol raha|discuss|call back|callback)\s+([^,.]+)/i);
    follow_up_note = matchNote ? matchNote[1].trim() : `Call back: ${followUpObj.display}`;
  }

  // 7. Extract Name: look at the beginning words before stop words
  const words = t.split(/\s+/);
  let name = '';
  const stopWords = [
    'kal', 'aaj', 'parso', 'perso', 'call', 'demat', 'account', 'hai', 'property', 'se', 'bol', 'bola', 
    'hi', 'hello', 'capital', 'broker', 'options', 'trader', 'trading', 'active', 'passive', 'job', 
    'work', 'business', 'dealer', 'beginner', 'new', 'old', 'options', 'selling', 'buying', 'calls', 
    'puts', 'nifty', 'banknifty', 'lakh', 'lacs', 'lac', 'cr', 'crore', 'thousand', 'k', 'pm', 'am', 
    'baje', 'bje', 'meet', 'gmeet', 'meeting', 'zoom', 'whatsapp', 'wa', 'used', 'using', 'done', 
    'scheduled', 'completed', 'interested', 'not', 'no', 'yes', 'busy', 'npc', 'wrong', 'enquiry', 
    'inquiry', 'data', 'mass', 'web', 'lead', 'leads', 'referral', 'client', 'customer', 'pro', 
    'professional', 'experienced', 'intermediate', 'broker', 'property', 'dealer', 'carpenter', 
    'doctor', 'engineer', 'teacher', 'student', 'worker', 'krta', 'karta', 'krti', 'karti', 'hai', 
    'h', 'he', 'is', 'a', 'an', 'the', 'with', 'for', 'of', 'and', 'se', 'bol', 'bola'
  ];
  if (words.length > 0) {
    const w1 = words[0].replace(/[^a-zA-Z]/g, '');
    const w2 = words[1] ? words[1].replace(/[^a-zA-Z]/g, '') : '';
    if (w1 && !stopWords.includes(w1.toLowerCase())) {
      name = w1;
      if (w2 && !stopWords.includes(w2.toLowerCase()) && w2.length > 1) {
        name += ' ' + w2;
      }
    }
  }

  // Double validation check: if the name is an invalid sales keyword or contains any stop words, set it to empty
  if (name) {
    const nameLower = name.toLowerCase();
    const hasInvalidWord = nameLower.split(' ').some(w => stopWords.includes(w));
    if (hasInvalidWord) {
      name = '';
    } else {
      name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
  }

  // 8. Extract raw feedback/notes
  const notes = t;

  return {
    name,
    phone,
    city,
    capital,
    notes,
    follow_up_note,
    broker,
    trading_experience,
  };
}
