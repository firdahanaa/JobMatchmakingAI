import type { NormalizedSkillEntry, TalentMatchProfileInput } from "./types";

/**
 * Rule-Based System: Kamus Referensi Padanan Istilah Keterampilan (Tabel 3.3 no. 6).
 *
 * Memetakan berbagai variasi penulisan (singkatan, bahasa Indonesia, bahasa Inggris,
 * variasi tanda baca) ke satu bentuk kanonis yang konsisten agar pencocokan
 * Skill Matching tidak gagal hanya karena perbedaan penulisan.
 */
export interface CanonicalSkillDefinition {
  canonical: string;
  aliases: readonly string[];
}

export const SKILL_SYNONYM_DEFINITIONS: readonly CanonicalSkillDefinition[] = [
  // --- Data & AI ---
  {
    canonical: "Python",
    aliases: ["python", "python3", "py", "pemrograman python"],
  },
  {
    canonical: "SQL",
    aliases: [
      "sql",
      "mysql",
      "postgresql",
      "postgres",
      "mariadb",
      "sqlite",
      "sql server",
      "mssql",
      "basis data",
      "database sql",
      "query sql",
    ],
  },
  {
    canonical: "Pandas",
    aliases: ["pandas", "python pandas"],
  },
  {
    canonical: "Excel",
    aliases: [
      "excel",
      "ms excel",
      "microsoft excel",
      "spreadsheet",
      "google sheets",
      "sheets",
    ],
  },
  {
    canonical: "Power BI",
    aliases: ["power bi", "powerbi", "microsoft power bi"],
  },
  {
    canonical: "Tableau",
    aliases: ["tableau", "tableau desktop"],
  },
  {
    canonical: "Data Visualization",
    aliases: [
      "data visualization",
      "visualisasi data",
      "data viz",
      "matplotlib",
      "seaborn",
    ],
  },
  {
    canonical: "Data Entry",
    aliases: ["data entry", "input data", "entri data"],
  },
  {
    canonical: "Data Cleaning",
    aliases: [
      "data cleaning",
      "pembersihan data",
      "data preprocessing",
      "pra-pemrosesan data",
      "data wrangling",
    ],
  },
  {
    canonical: "Data Analysis",
    aliases: [
      "data analysis",
      "analisis data",
      "analisa data",
      "data analytics",
      "pengolahan data",
    ],
  },
  {
    canonical: "Machine Learning",
    aliases: [
      "machine learning",
      "pembelajaran mesin",
      "scikit-learn",
      "sklearn",
      "tensorflow",
      "pytorch",
      "deep learning",
    ],
  },

  // --- Development & Engineering ---
  {
    canonical: "HTML/CSS",
    aliases: [
      "html/css",
      "html & css",
      "html css",
      "html",
      "html5",
      "css",
      "css3",
      "tailwind",
      "tailwind css",
      "tailwindcss",
      "bootstrap",
    ],
  },
  {
    canonical: "JavaScript",
    aliases: ["javascript", "js", "es6", "ecmascript", "vanilla js"],
  },
  {
    canonical: "TypeScript",
    aliases: ["typescript", "ts"],
  },
  {
    canonical: "React",
    aliases: ["react", "reactjs", "react.js", "react js"],
  },
  {
    canonical: "Next.js",
    aliases: ["next.js", "nextjs", "next js"],
  },
  {
    canonical: "Vue.js",
    aliases: ["vue.js", "vuejs", "vue", "nuxt", "nuxt.js"],
  },
  {
    canonical: "Node.js",
    aliases: ["node.js", "nodejs", "node js", "express", "express.js", "expressjs"],
  },
  {
    canonical: "PHP/Laravel",
    aliases: ["php/laravel", "php", "laravel", "codeigniter"],
  },
  {
    canonical: "Java",
    aliases: ["java", "spring boot", "springboot"],
  },
  {
    canonical: "C/C++",
    aliases: ["c/c++", "c++", "cpp", "bahasa c", "pemrograman c"],
  },
  {
    canonical: "C#",
    aliases: ["c#", "csharp", "c-sharp", ".net", "dotnet", "asp.net"],
  },
  {
    canonical: "Golang",
    aliases: ["golang", "go lang"],
  },
  {
    canonical: "Flutter",
    aliases: ["flutter", "dart", "flutter/dart"],
  },
  {
    canonical: "React Native",
    aliases: ["react native", "react-native"],
  },
  {
    canonical: "Kotlin",
    aliases: ["kotlin", "android kotlin"],
  },
  {
    canonical: "WordPress",
    aliases: ["wordpress", "wp", "elementor"],
  },
  {
    canonical: "Git",
    aliases: ["git", "github", "gitlab", "version control"],
  },
  {
    canonical: "Docker",
    aliases: ["docker", "containerization", "kontainerisasi"],
  },
  {
    canonical: "REST API",
    aliases: ["rest api", "restful api", "api development", "web api"],
  },
  {
    canonical: "MongoDB",
    aliases: ["mongodb", "mongo db", "nosql"],
  },
  {
    canonical: "Linux",
    aliases: ["linux", "ubuntu", "administrasi linux", "shell scripting"],
  },
  {
    canonical: "Computer Networking",
    aliases: [
      "computer networking",
      "jaringan komputer",
      "networking",
      "mikrotik",
      "cisco",
      "tcp/ip",
    ],
  },
  {
    canonical: "Cybersecurity",
    aliases: [
      "cybersecurity",
      "cyber security",
      "keamanan siber",
      "keamanan informasi",
      "information security",
      "penetration testing",
    ],
  },
  {
    canonical: "Quality Assurance",
    aliases: [
      "quality assurance",
      "qa",
      "software testing",
      "pengujian perangkat lunak",
      "manual testing",
      "automated testing",
    ],
  },
  {
    canonical: "System Analysis",
    aliases: [
      "system analysis",
      "analisis sistem",
      "analisa sistem",
      "system analyst",
      "uml",
      "erd",
    ],
  },

  // --- Design & Multimedia ---
  {
    canonical: "UI/UX Design",
    aliases: [
      "ui/ux design",
      "ui/ux",
      "ui ux",
      "ui design",
      "ux design",
      "desain ui/ux",
      "desain antarmuka",
      "user interface",
      "user experience",
      "wireframing",
      "prototyping",
    ],
  },
  {
    canonical: "Figma",
    aliases: ["figma"],
  },
  {
    canonical: "Graphic Design",
    aliases: [
      "graphic design",
      "desain grafis",
      "desainer grafis",
      "visual design",
      "desain visual",
    ],
  },
  {
    canonical: "Canva",
    aliases: ["canva"],
  },
  {
    canonical: "Adobe Illustrator",
    aliases: ["adobe illustrator", "illustrator"],
  },
  {
    canonical: "Adobe Photoshop",
    aliases: ["adobe photoshop", "photoshop"],
  },
  {
    canonical: "Video Editing",
    aliases: [
      "video editing",
      "editing video",
      "edit video",
      "premiere pro",
      "adobe premiere",
      "capcut",
      "davinci resolve",
    ],
  },
  {
    canonical: "Motion Graphics",
    aliases: ["motion graphics", "motion graphic", "after effects", "adobe after effects"],
  },

  // --- Marketing & Content ---
  {
    canonical: "Social Media Management",
    aliases: [
      "social media management",
      "manajemen media sosial",
      "social media",
      "media sosial",
      "admin media sosial",
    ],
  },
  {
    canonical: "Content Writing",
    aliases: [
      "content writing",
      "penulisan konten",
      "penulis konten",
      "content writer",
      "artikel blog",
    ],
  },
  {
    canonical: "Copywriting",
    aliases: ["copywriting", "copywriter", "penulisan iklan"],
  },
  {
    canonical: "Content Creation",
    aliases: [
      "content creation",
      "content creator",
      "pembuatan konten",
      "kreator konten",
    ],
  },
  {
    canonical: "SEO",
    aliases: ["seo", "search engine optimization", "optimasi mesin pencari"],
  },
  {
    canonical: "Digital Marketing",
    aliases: [
      "digital marketing",
      "pemasaran digital",
      "online marketing",
      "meta ads",
      "google ads",
    ],
  },
  {
    canonical: "Photography",
    aliases: ["photography", "fotografi", "fotografer"],
  },

  // --- Business & Operations ---
  {
    canonical: "Project Management",
    aliases: [
      "project management",
      "manajemen proyek",
      "pengelolaan proyek",
      "scrum",
      "agile",
      "trello",
      "jira",
    ],
  },
  {
    canonical: "Event Organizing",
    aliases: [
      "event organizing",
      "event organizer",
      "manajemen acara",
      "penyelenggaraan acara",
    ],
  },
  {
    canonical: "Administration",
    aliases: [
      "administration",
      "administrasi",
      "administrasi perkantoran",
      "microsoft office",
      "ms office",
      "microsoft word",
      "ms word",
    ],
  },
  {
    canonical: "Bookkeeping",
    aliases: ["bookkeeping", "pembukuan", "akuntansi", "accounting"],
  },
  {
    canonical: "Public Speaking",
    aliases: [
      "public speaking",
      "berbicara di depan umum",
      "presentasi",
      "komunikasi publik",
    ],
  },
  {
    canonical: "Translation",
    aliases: ["translation", "penerjemahan", "penerjemah", "translator"],
  },
];

function cleanSkillSurface(raw: string): string {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ALIAS_TO_CANONICAL = new Map<string, NormalizedSkillEntry>();

for (const def of SKILL_SYNONYM_DEFINITIONS) {
  const entry: NormalizedSkillEntry = {
    key: cleanSkillSurface(def.canonical),
    label: def.canonical,
  };
  ALIAS_TO_CANONICAL.set(entry.key, entry);
  for (const alias of def.aliases) {
    ALIAS_TO_CANONICAL.set(cleanSkillSurface(alias), entry);
  }
}

/**
 * Alias pendek (<=2 karakter) yang rawan false-positive saat dipindai pada teks bebas CV.
 * Tetap valid jika muncul sebagai item eksplisit di daftar skill, tetapi tidak
 * dipindai otomatis dari paragraf bebas CV.
 */
const AMBIGUOUS_FREE_TEXT_ALIASES = new Set(["py", "js", "ts", "wp", "qa", "go"]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface FreeTextSkillPattern {
  regex: RegExp;
  entry: NormalizedSkillEntry;
}

const FREE_TEXT_SKILL_PATTERNS: FreeTextSkillPattern[] = Array.from(
  ALIAS_TO_CANONICAL.entries()
)
  .filter(([alias]) => !AMBIGUOUS_FREE_TEXT_ALIASES.has(alias))
  .map(([alias, entry]) => ({
    // Gunakan boundary non-alfanumerik agar istilah seperti "c++", "c#", "next.js", "ui/ux" tetap cocok tepat
    regex: new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegex(alias)}(?![\\p{L}\\p{N}])`,
      "iu"
    ),
    entry,
  }));

/**
 * Menormalisasi satu istilah keterampilan menggunakan kamus padanan (Rule-Based).
 * Jika istilah belum terdaftar di kamus, tetap dipertahankan secara bersih (NFKC + trim).
 */
export function normalizeSkill(rawSkill: string): NormalizedSkillEntry | null {
  const trimmed = rawSkill.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!trimmed) return null;

  const surface = cleanSkillSurface(trimmed);
  const mapped = ALIAS_TO_CANONICAL.get(surface);
  if (mapped) {
    return mapped;
  }

  return {
    key: surface,
    label: trimmed,
  };
}

/**
 * Menormalisasi dan menghapus duplikat dari daftar keterampilan (Rule-Based).
 */
export function normalizeAndDeduplicateSkills(
  rawSkills: readonly string[] | null | undefined
): NormalizedSkillEntry[] {
  if (!rawSkills || rawSkills.length === 0) return [];

  const unique = new Map<string, NormalizedSkillEntry>();
  for (const raw of rawSkills) {
    // Beberapa CV menuliskan daftar skill dalam satu string dipisah koma/titik koma/bullet
    const parts = raw.split(/[,;|•\n]/);
    for (const part of parts) {
      const normalized = normalizeSkill(part);
      if (normalized && !unique.has(normalized.key)) {
        unique.set(normalized.key, normalized);
      }
    }
  }
  return Array.from(unique.values());
}

/**
 * Mengidentifikasi keterampilan yang dikenal dari teks bebas (mis. isi CV ATS,
 * headline, bio, atau deskripsi pengalaman kerja) berbasis kamus padanan istilah.
 */
export function extractKnownSkillsFromText(text: string | null | undefined): NormalizedSkillEntry[] {
  if (!text?.trim()) return [];

  const cleanedText = text.normalize("NFKC");
  const detected = new Map<string, NormalizedSkillEntry>();

  for (const { regex, entry } of FREE_TEXT_SKILL_PATTERNS) {
    if (!detected.has(entry.key) && regex.test(cleanedText)) {
      detected.set(entry.key, entry);
    }
  }

  return Array.from(detected.values());
}

/**
 * Menggabungkan seluruh sumber keterampilan Talent (profil manual, bagian skills CV,
 * serta istilah keterampilan yang teridentifikasi pada teks CV dan profil),
 * lalu menormalisasi dan menghapus duplikatnya.
 */
export function extractTalentNormalizedSkills(
  talent: TalentMatchProfileInput
): NormalizedSkillEntry[] {
  const merged = new Map<string, NormalizedSkillEntry>();

  const addEntries = (entries: readonly NormalizedSkillEntry[]) => {
    for (const entry of entries) {
      if (!merged.has(entry.key)) {
        merged.set(entry.key, entry);
      }
    }
  };

  addEntries(normalizeAndDeduplicateSkills(talent.profileSkills));
  addEntries(normalizeAndDeduplicateSkills(talent.cvStructuredSkills));

  const freeTextParts = [
    talent.headline,
    talent.bio,
    talent.education,
    ...(talent.workExperience ?? []).flatMap((item) => [item.role, item.description]),
    talent.cvExtractedText,
  ]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n");

  addEntries(extractKnownSkillsFromText(freeTextParts));

  return Array.from(merged.values());
}
