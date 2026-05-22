const fs = require('fs');
const html = fs.readFileSync('c:/nuri/Ongjin_coupon/frontend/admin/users.html', 'utf8');
const script = html.substring(html.indexOf('<script type="module">') + 22, html.indexOf('</script>'));
fs.writeFileSync('c:/nuri/Ongjin_coupon/frontend/test.js', script);
