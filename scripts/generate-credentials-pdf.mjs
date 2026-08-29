import path from 'node:path';
import { chromium } from 'playwright';

const OUTPUT_PDF_PATH = path.resolve('AU_JAS_LMS_Test_Credentials.pdf');

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AU-JAS LMS — Test Credentials Directory</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.4;
      font-size: 11px;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    h1 {
      font-size: 20px;
      color: #0f172a;
      margin: 0 0 4px 0;
      font-weight: 700;
    }
    .subtitle {
      color: #64748b;
      font-size: 11px;
      margin: 0;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-primary { background-color: #e0f2fe; color: #0369a1; }
    .badge-admin { background-color: #fef3c7; color: #92400e; }
    .badge-dean { background-color: #ede9fe; color: #6d28d9; }
    .badge-reg { background-color: #e0e7ff; color: #3730a3; }
    .badge-faculty { background-color: #dcfce7; color: #166534; }
    .badge-student { background-color: #f1f5f9; color: #334155; }
    .badge-invited { background-color: #fee2e2; color: #991b1b; }

    .callout {
      background-color: #f8fafc;
      border-left: 4px solid #0284c7;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 16px;
    }
    .callout-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 12px;
      margin-bottom: 3px;
    }
    .callout-text {
      color: #475569;
      font-size: 11px;
    }
    .code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #e2e8f0;
      padding: 2px 5px;
      border-radius: 4px;
      font-weight: 600;
      color: #0f172a;
    }

    h2 {
      font-size: 13px;
      font-weight: 700;
      color: #1e293b;
      margin: 16px 0 8px 0;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    th {
      background-color: #f1f5f9;
      text-align: left;
      padding: 6px 8px;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      border: 1px solid #e2e8f0;
      text-transform: uppercase;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
      vertical-align: middle;
    }
    tr:nth-child(even) {
      background-color: #fafafa;
    }
    .user-email {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: #0369a1;
      font-size: 10px;
    }
    .password-cell {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
      color: #0f172a;
      background-color: #f8fafc;
      font-size: 10px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h1>Arellano University (AU-JAS) LMS</h1>
      <p class="subtitle">Live Environment Test Credentials Directory & User Accounts</p>
    </div>
    <div style="text-align: right;">
      <span class="badge badge-primary">Live Production Ready</span>
    </div>
  </div>

  <div class="callout">
    <div class="callout-title">Global Login & Password Details</div>
    <div class="callout-text">
      <strong>Live URL:</strong> <a href="https://learning-management-system-for-au-j.vercel.app/login" style="color: #0284c7; text-decoration: none;">https://learning-management-system-for-au-j.vercel.app/login</a><br>
      <strong>Standard Password for All Accounts:</strong> <span class="code">Password123!</span> <em>(Capital P, ends with exclamation mark)</em>
    </div>
  </div>

  <h2>1. Primary Role Accounts (Recommended for Testing)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Role</th>
        <th style="width: 25%;">Full Name</th>
        <th style="width: 35%;">Email Address</th>
        <th style="width: 18%;">Password</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span class="badge badge-admin">Multi-Role (Admin/Dean/Faculty)</span></td>
        <td>Julius Tolentino</td>
        <td class="user-email">juliustolentino.diamond@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-student">Student (Fully Seeded)</span></td>
        <td>Julius Robert Tolentino</td>
        <td class="user-email">crowsnight379@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-dean">Dean</span></td>
        <td>Julius RobertS Tolentino</td>
        <td class="user-email">juliustolentino0101@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-reg">Registrar</span></td>
        <td>Registrar User</td>
        <td class="user-email">hbaki386@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-faculty">Faculty</span></td>
        <td>Faculty Luna</td>
        <td class="user-email">luna.akirapogi@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-faculty">Faculty</span></td>
        <td>Juliusss Robert</td>
        <td class="user-email">juliusexample@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-student">Student</span></td>
        <td>Julius Roberta Tolentino</td>
        <td class="user-email">julius.iveinc@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-student">Student</span></td>
        <td>Erika Orias</td>
        <td class="user-email">redep1892@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-student">Student</span></td>
        <td>Student Test 1</td>
        <td class="user-email">lmstest.mel01@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td><span class="badge badge-invited">Invited (Onboarding Gate)</span></td>
        <td>dsa dsad</td>
        <td class="user-email">dsadsa@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Administrator Accounts (/admin)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Full Name</th>
        <th style="width: 50%;">Email Address</th>
        <th style="width: 20%;">Password</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Julius Tolentino (Multi-Role)</td>
        <td class="user-email">juliustolentino.diamond@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Paolo Tolentino</td>
        <td class="user-email">dummy_user_6@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Paolo Lim</td>
        <td class="user-email">dummy_user_65@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Julius Garcia</td>
        <td class="user-email">dummy_user_68@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Elena Mendoza</td>
        <td class="user-email">dummy_user_73@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Dean Accounts (/dean)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Full Name</th>
        <th style="width: 50%;">Email Address</th>
        <th style="width: 20%;">Password</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Julius RobertS Tolentino</td>
        <td class="user-email">juliustolentino0101@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Ricardo Garcia</td>
        <td class="user-email">dummy_user_26@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Elena Cruz</td>
        <td class="user-email">dummy_user_33@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Liza Ramos</td>
        <td class="user-email">dummy_user_43@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Rosa Ramos</td>
        <td class="user-email">dummy_user_44@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Gabriel Luna</td>
        <td class="user-email">dummy_user_49@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Liza Ferrer</td>
        <td class="user-email">dummy_user_50@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Ignacio Reyes</td>
        <td class="user-email">dummy_user_51@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Maria Reyes</td>
        <td class="user-email">dummy_user_66@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Teresa Ferrer</td>
        <td class="user-email">dummy_user_7@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Juan Cruz</td>
        <td class="user-email">dummy_user_80@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
    </tbody>
  </table>

  <h2>4. Registrar Accounts (/registrar)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Full Name</th>
        <th style="width: 50%;">Email Address</th>
        <th style="width: 20%;">Password</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Registrar User</td>
        <td class="user-email">hbaki386@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Roberto Mendoza</td>
        <td class="user-email">dummy_user_36@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Ignacio Reyes</td>
        <td class="user-email">dummy_user_47@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Manuel Villanueva</td>
        <td class="user-email">dummy_user_69@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Gabriel Soriano</td>
        <td class="user-email">dummy_user_86@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Elena Garcia</td>
        <td class="user-email">dummy_user_102@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
    </tbody>
  </table>

  <h2>5. Faculty Accounts (/faculty)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Full Name</th>
        <th style="width: 50%;">Email Address</th>
        <th style="width: 20%;">Password</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Faculty Luna</td>
        <td class="user-email">luna.akirapogi@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Juliusss Robert</td>
        <td class="user-email">juliusexample@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Rosa Mercado</td>
        <td class="user-email">dummy_user_11@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Juan Ferrer</td>
        <td class="user-email">dummy_user_16@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Roberto Mendoza</td>
        <td class="user-email">dummy_user_28@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Rosa Soriano</td>
        <td class="user-email">dummy_user_48@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Manuel Garcia</td>
        <td class="user-email">dummy_user_82@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Maria Garcia</td>
        <td class="user-email">dummy_user_89@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Liza Reyes</td>
        <td class="user-email">dummy_user_9@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Maria Pascual</td>
        <td class="user-email">dummy_user_94@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
    </tbody>
  </table>

  <h2>6. Student Accounts (/student)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Full Name</th>
        <th style="width: 50%;">Email Address</th>
        <th style="width: 20%;">Password</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Julius Robert Tolentino (Primary - Seeded)</td>
        <td class="user-email">crowsnight379@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Julius Roberta Tolentino</td>
        <td class="user-email">julius.iveinc@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Erika Orias</td>
        <td class="user-email">redep1892@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Student Test 1</td>
        <td class="user-email">lmstest.mel01@gmail.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Dante Mendoza</td>
        <td class="user-email">dummy_user_58@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Manuel Ramos</td>
        <td class="user-email">dummy_user_61@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Paolo Dizon</td>
        <td class="user-email">dummy_user_67@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
      <tr>
        <td>Sofia Pascual</td>
        <td class="user-email">dummy_user_87@example.com</td>
        <td class="password-cell">Password123!</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Arellano University (Jose Abad Santos Campus) — Learning Management System</span>
    <span>Generated: August 2026</span>
  </div>

</body>
</html>
`;

async function generatePdf() {
  console.log('Generating PDF...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  
  await page.setContent(HTML_CONTENT, { waitUntil: 'networkidle' });
  await page.pdf({
    path: OUTPUT_PDF_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm'
    }
  });

  await browser.close();
  console.log(`PDF successfully created at: ${OUTPUT_PDF_PATH}`);
}

generatePdf().catch(console.error);

