const fs = require('fs');
const path = require('path');

// Read app.js
const appJsPath = path.join(__dirname, '..', 'app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Use regex to find all paths
// e.g. path: "二上/乘法心臟病.html"
const pathRegex = /path:\s*["']([^"']+)["']/g;
let match;
const paths = [];

while ((match = pathRegex.exec(appJsContent)) !== null) {
    paths.push(match[1]);
}

console.log(`Found ${paths.length} tool paths.`);

const baseUrl = 'https://hctsao.github.io/teachertsao/';

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}index.html</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
`;

for (const p of paths) {
    // URL encode the path segments (but keep the slash)
    const encodedSegments = p.split('/').map(segment => encodeURIComponent(segment));
    const encodedPath = encodedSegments.join('/');
    const fullUrl = `${baseUrl}${encodedPath}`;
    
    xml += `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
}

xml += `</urlset>\n`;

const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log('Successfully wrote sitemap.xml!');
