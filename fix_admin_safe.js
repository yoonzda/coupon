const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'frontend/admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'login.html');

const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F200}-\u{1F251}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F171}\u{1F17E}-\u{1F17F}\u{1F18E}\u{3030}\u{2B50}\u{2B55}\u{2934}-\u{2935}\u{2B05}-\u{2B07}\u{2B1B}-\u{2B1C}\u{3297}\u{3299}\u{303D}\u{00A9}\u{00AE}\u{2122}\u{23F3}\u{24C2}\u{23E9}-\u{23EF}\u{25B6}\u{23F8}-\u{23FA}]/gu;

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Remove the hardcoded sidebar footer
  content = content.replace(/<div style="padding: 24px; border-top: 1px solid rgba\(255,255,255,0\.1\);">[\s\S]*?<\/button>\s*<\/div>/g, '');

  // Strip emojis safely without messing up newlines
  content = content.replace(emojiRegex, '');

  // Clean spacing around title specifically
  content = content.replace(/옹진관광/g, '옹진 관광');

  fs.writeFileSync(path.join(dir, file), content);
}
console.log('Fixed admin HTML files safely.');
