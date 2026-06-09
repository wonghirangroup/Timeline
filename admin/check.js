const fs = require('fs');
const path = require('path');
function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (let f of files) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      checkDir(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      const content = fs.readFileSync(p, 'utf8');
      const regex = /from ['"](\.\.?\/[^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content))) {
        const importPath = match[1];
        const parts = importPath.split('/');
        let curr = path.dirname(p);
        let ok = true;
        for (let part of parts) {
          if (part === '.' || part === '..') {
            curr = path.join(curr, part);
          } else {
            const dFiles = fs.readdirSync(curr);
            const exact = dFiles.find(df => df === part || df === part + '.ts' || df === part + '.tsx' || df === part + '.css');
            if (!exact) {
              const lower = dFiles.find(df => df.toLowerCase() === part.toLowerCase() || df.toLowerCase() === part.toLowerCase() + '.ts' || df.toLowerCase() === part.toLowerCase() + '.tsx');
              if (lower) {
                console.log('CASE SENSITIVITY ERROR in', p, 'importing', importPath, 'actual file is', lower);
              } else {
                console.log('NOT FOUND in', p, 'importing', importPath);
              }
              ok = false;
              break;
            }
            curr = path.join(curr, exact);
          }
        }
      }
    }
  }
}
checkDir('./src');
