import fs from 'fs';
import path from 'path';

// Read the array from create_30_courses_per_dept.mjs or define it
import { runQuery } from './query.mjs';

async function generateCsv() {
  const fileContent = fs.readFileSync('scripts/create_30_courses_per_dept.mjs', 'utf8');
  // Parse out the array
  const startIdx = fileContent.indexOf('const coursesToCreate = [');
  const endIdx = fileContent.indexOf('];\n\nasync function createAllCourses()');
  
  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not parse courses array from script.');
    return;
  }

  const arrayStr = fileContent.substring(startIdx + 'const coursesToCreate = '.length, endIdx + 1);
  const courses = eval(arrayStr);

  const headers = ['Code', 'Title', 'Department Code', 'Course Type Code', 'Lecture Units', 'Laboratory Units', 'Credit Hours', 'Description', 'Is Active', 'Prerequisites'];
  
  const csvRows = [headers.join(',')];

  for (const c of courses) {
    const row = [
      `"${c.code.replace(/"/g, '""')}"`,
      `"${c.title.replace(/"/g, '""')}"`,
      `"${c.department_code.replace(/"/g, '""')}"`,
      `"${c.course_type_code.replace(/"/g, '""')}"`,
      c.lecture_units,
      c.laboratory_units,
      c.credit_hours,
      `"${(c.description || '').replace(/"/g, '""')}"`,
      c.is_active,
      `"${(c.prerequisites || '').replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  }

  const csvOutput = csvRows.join('\n');
  const targetPath = path.resolve(process.cwd(), 'courses_30_per_dept_import.csv');
  fs.writeFileSync(targetPath, csvOutput, 'utf8');

  console.log(`Successfully generated CSV file with ${courses.length} courses at: ${targetPath}`);
}

generateCsv().catch(console.error);
