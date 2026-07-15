const { execSync } = require('child_process');

try {
    console.log("[Wispbyte Fix] Force-installing sqlite3 bindings...");
    execSync('npm rebuild sqlite3 --update-binary', { stdio: 'inherit' });
    console.log("[Wispbyte Fix] Bindings ready!");
} catch (e) {
    console.error("[Wispbyte Fix] Failed to rebuild bindings, but attempting to start anyway...");
}

require('ts-node').register();
require('./src/index.ts');
