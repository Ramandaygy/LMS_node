const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/Lenovo/Dokumen/TA/LMS_node/frontend/src/pages/auth';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace ScholarFlow occurrences
  content = content.replace(/<h1>ScholarFlow<\/h1>/g, '<h1>SMP N 1 SURADADI</h1>');
  content = content.replace(/<h2>ScholarFlow<\/h2>/g, '<h2>SMP N 1 SURADADI</h2>');
  content = content.replace(/SMP N 1 ScholarFlow hari ini/gi, 'SMP N 1 Suradadi');
  content = content.replace(/Join SMP N 1 ScholarFlow today/g, 'Join SMP N 1 Suradadi today');
  content = content.replace(/SMP N 1 ScholarFlow v4\.2\.0/g, 'SMP N 1 SURADADI v1.0');
  content = content.replace(/Welcome to SMP N 1 ScholarFlow[^<]*/g, 'Welcome to SMP N 1 Suradadi .');
  content = content.replace(/admin@scholarflow\.edu/g, 'admin@smpn1suradadi.sch.id');

  // Structure alignment for Siswa and Ortu
  if (file.includes('Siswa') || file.includes('Ortu')) {
    // Remove ACTIVATE tab
    content = content.replace(/<button className="auth-tab">ACTIVATE<\/button>\s*/g, '');
    
    // Change Access Dashboard to Login
    content = content.replace(/{loading \? 'Processing\.\.\.' : 'Access Dashboard'}/g, '{loading ? \'Processing...\' : \'Login\'}');
    
    // Adjust welcome message titles
    content = content.replace(/<h2>A Legacy of <span>Excellence<\/span>, Digitalized\.<\/h2>/g, '<h2>Student <span>Portal</span></h2>');
    
    // Fix auth-register-prompt
    if (file.includes('LoginSiswa')) {
      content = content.replace(/<div className="auth-register-prompt\">[\s\S]*?<\/div>/, '<div className="auth-register-prompt">\n              <p>First time here? Register your student account.</p>\n            </div>');
    }
    if (file.includes('LoginOrtu')) {
      content = content.replace(/<div className="auth-register-prompt\">[\s\S]*?<\/div>/, '<div className="auth-register-prompt">\n              <p>First time here? Register your parent account.</p>\n            </div>');
    }
    
    // Remove Technical Support from footer (to match admin)
    content = content.replace(/<div className="auth-footer-support">\s*<span className="material-symbols-outlined">support_agent<\/span>\s*<span>Technical Support<\/span>\s*<\/div>/g, '<div className="auth-footer-support">\n              <span className="material-symbols-outlined">support_agent</span>\n            </div>');
  }

  fs.writeFileSync(filePath, content, 'utf8');
}
