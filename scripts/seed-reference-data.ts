import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { referenceCards } from "../src/db/reference-schema";
import { v4 as uuid } from "uuid";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const REPO_URL = "https://github.com/JunkWaxHero/CardLists.git";
const CLONE_DIR = "./tmp/CardLists";
const DB_PATH = "./imago.db";

if (!existsSync(CLONE_DIR)) {
  console.log("Cloning JunkWaxHero CardLists...");
  execSync(`git clone --depth 1 ${REPO_URL} ${CLONE_DIR}`, { stdio: "inherit" });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

migrate(db, { migrationsFolder: "./drizzle" });

const sports = ["baseball", "hockey"];
let totalInserted = 0;

for (const sport of sports) {
  const sportDir = join(CLONE_DIR, sport);
  if (!existsSync(sportDir)) {
    console.log(`No ${sport} directory found, skipping.`);
    continue;
  }

  const yearDirs = readdirSync(sportDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const yearDir of yearDirs) {
    const yearPath = join(sportDir, yearDir);
    const jsonFiles = readdirSync(yearPath).filter((f) => f.endsWith(".json"));

    for (const jsonFile of jsonFiles) {
      try {
        const content = readFileSync(join(yearPath, jsonFile), "utf-8");
        const data = JSON.parse(content);
        const year = parseInt(yearDir, 10) || null;
        const brand = data.name ?? jsonFile.replace(".json", "").replace(`${yearDir}-`, "");

        if (!data.sets) continue;

        for (const set of data.sets) {
          if (!set.cards) continue;

          for (const card of set.cards) {
            db.insert(referenceCards)
              .values({
                id: uuid(),
                playerName: card.name ?? "Unknown",
                year,
                brand,
                setName: set.name ?? brand,
                cardNumber: card.number ?? null,
                sport,
                subset: set.name !== brand ? set.name : null,
                attributes: card.attributes ? JSON.stringify(card.attributes) : null,
              })
              .run();
            totalInserted++;
          }
        }
      } catch (err) {
        console.error(`Error processing ${jsonFile}:`, err);
      }
    }
  }

  console.log(`Finished ${sport}`);
}

console.log(`Seeded ${totalInserted} reference cards.`);
sqlite.close();
