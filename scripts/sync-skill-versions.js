#!/usr/bin/env node
/**
 * sync-skill-versions.js — Update agent skill files to match the spec version.
 *
 * Rewrites `.agents/skills/dsds-*` SKILL.md files so their YAML frontmatter
 * `metadata.version`, URL fragments, `dsdsVersion` literals, and any other
 * remaining version strings all point at the current (or specified) spec
 * version.
 *
 * Usage:
 *   node scripts/sync-skill-versions.js              # use version from schema
 *   node scripts/sync-skill-versions.js <version>    # explicit target version
 *   node scripts/sync-skill-versions.js --dry-run    # preview only
 *   node scripts/sync-skill-versions.js --help
 *
 * When run without a version argument, reads the target from
 * spec/schema/dsds.schema.json#/properties/dsdsVersion/const — so running
 * this after bump-version.js picks up the freshly bumped value automatically.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ROOT_SCHEMA = path.join(ROOT, "spec", "schema", "dsds.schema.json");
const SKILLS_DIR = path.join(ROOT, ".agents", "skills");

function printHelp() {
  console.log(`
sync-skill-versions — sync agent skill DSDS version references

Usage:
  node scripts/sync-skill-versions.js [<version>] [--dry-run]

Arguments:
  <version>    Target version string (ex: 0.15.2). If omitted, reads from
               spec/schema/dsds.schema.json#/properties/dsdsVersion/const.

Options:
  --dry-run    Print planned changes without writing files.
  --help, -h   Show this help.
`);
}

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

const flags = new Set(args.filter((a) => a.startsWith("--")));
const positional = args.filter((a) => !a.startsWith("--"));
const DRY_RUN = flags.has("--dry-run");

let TARGET_VERSION;
if (positional.length > 1) {
  console.error("✗ Expected at most one positional argument: <version>");
  process.exit(1);
}

if (positional.length === 1) {
  TARGET_VERSION = positional[0];
} else {
  if (!fs.existsSync(ROOT_SCHEMA)) {
    console.error(`✗ Root schema not found: ${path.relative(ROOT, ROOT_SCHEMA)}`);
    process.exit(1);
  }
  const rootJson = JSON.parse(fs.readFileSync(ROOT_SCHEMA, "utf-8"));
  TARGET_VERSION =
    rootJson &&
    rootJson.properties &&
    rootJson.properties.dsdsVersion &&
    rootJson.properties.dsdsVersion.const;
  if (!TARGET_VERSION) {
    console.error(
      "✗ Could not read version from " +
        `${path.relative(ROOT, ROOT_SCHEMA)}#/properties/dsdsVersion/const`,
    );
    process.exit(1);
  }
}

if (!/^[A-Za-z0-9]+(\.[A-Za-z0-9-]+)*$/.test(TARGET_VERSION)) {
  console.error(`✗ Invalid version string: "${TARGET_VERSION}"`);
  process.exit(1);
}

const URL_REGEX = /designsystemdocspec\.org\/v([A-Za-z0-9.\-]+)\//g;
const NEW_URL_FRAGMENT = `designsystemdocspec.org/v${TARGET_VERSION}/`;
const DSDS_VERSION_LITERAL_REGEX = /("dsdsVersion"\s*:\s*")([A-Za-z0-9.\-]+)(")/g;
const FRONTMATTER_VERSION_REGEX = /(metadata:\s*\n\s*version:\s*)\S+/;

function rewriteUrlsInText(text) {
  let count = 0;
  const updated = text.replace(URL_REGEX, (match, foundVersion) => {
    if (foundVersion === TARGET_VERSION) return match;
    count++;
    return NEW_URL_FRAGMENT;
  });
  return { updated, count };
}

function rewriteDsdsVersionLiterals(text) {
  let count = 0;
  const updated = text.replace(DSDS_VERSION_LITERAL_REGEX, (match, before, oldVer, after) => {
    if (oldVer === TARGET_VERSION) return match;
    count++;
    return before + TARGET_VERSION + after;
  });
  return { updated, count };
}

if (!fs.existsSync(SKILLS_DIR)) {
  console.log("No .agents/skills directory found — nothing to do.");
  process.exit(0);
}

const skillFiles = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("dsds-"))
  .map((d) => path.join(SKILLS_DIR, d.name, "SKILL.md"))
  .filter((p) => fs.existsSync(p));

if (skillFiles.length === 0) {
  console.log("No dsds-* skill files found — nothing to do.");
  process.exit(0);
}

const schemaJson = JSON.parse(fs.readFileSync(ROOT_SCHEMA, "utf-8"));
const CURRENT_SCHEMA_VERSION =
  schemaJson.properties.dsdsVersion.const;

console.log(`Syncing agent skill versions to v${TARGET_VERSION}`);
if (DRY_RUN) console.log("(dry run — no files will be written)");
console.log();

let totalFiles = 0;
let totalReplacements = 0;
const changedFiles = [];

for (const file of skillFiles) {
  const original = fs.readFileSync(file, "utf-8");
  let text = original;
  let count = 0;

  // Frontmatter metadata.version → target version
  text = text.replace(FRONTMATTER_VERSION_REGEX, (m, prefix) => {
    if (m.slice(prefix.length) === TARGET_VERSION) return m;
    count++;
    return prefix + TARGET_VERSION;
  });

  // Body: rewrite URLs and dsdsVersion literals
  let r = rewriteUrlsInText(text);
  text = r.updated; count += r.count;

  r = rewriteDsdsVersionLiterals(text);
  text = r.updated; count += r.count;

  // Catch-all: remaining literal version strings the regexes don't cover.
  if (CURRENT_SCHEMA_VERSION !== TARGET_VERSION) {
    const before = text;
    text = text.replaceAll(CURRENT_SCHEMA_VERSION, TARGET_VERSION);
    if (text !== before) {
      count += before.split(CURRENT_SCHEMA_VERSION).length - 1;
    }
  }

  if (text !== original) {
    totalFiles++;
    totalReplacements += count;
    changedFiles.push(path.relative(ROOT, file));
    if (!DRY_RUN) fs.writeFileSync(file, text, "utf-8");
  }
}

if (totalFiles === 0) {
  console.log(`All skill files already at v${TARGET_VERSION}. Nothing to do.`);
  process.exit(0);
}

const action = DRY_RUN ? "Would update" : "Updated";
console.log(`${action} ${totalFiles} file(s) (${totalReplacements} replacements):`);
for (const f of changedFiles) console.log(`  ${f}`);
console.log();

if (DRY_RUN) {
  console.log("Dry run complete. Rerun without --dry-run to apply.");
} else {
  console.log("✓ Skill versions synced.");
}
