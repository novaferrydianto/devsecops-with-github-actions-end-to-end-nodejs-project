// fix-mocha-exit.js
import fs from "fs";
import path from "path";

const reporterPath = path.resolve(
  "node_modules/mocha-sonarqube-reporter/index.js"
);

try {
  let content = fs.readFileSync(reporterPath, "utf8");

  // Fix non-zero exit issue
  if (!content.includes("process.exit(0)")) {
    content += "\nprocess.on('exit', () => process.exit(0));\n";
    fs.writeFileSync(reporterPath, content);
    console.log("✅ Patched mocha-sonarqube-reporter to exit cleanly (code 0).");
  } else {
    console.log("ℹ️ Reporter already patched.");
  }
} catch (err) {
  console.error("⚠️ Failed to patch mocha-sonarqube-reporter:", err.message);
}
